import { scheduler, RATINGS, toState, fromState, presentationIdOf, endOfLocalDay } from "@/lib/review-logic";
export { toState, presentationIdOf, endOfLocalDay } from "@/lib/review-logic";
import { and, asc, desc, eq, isNull, lt, or, sql } from "drizzle-orm";
import { createEmptyCard } from "ts-fsrs";
import { aiFlashcardSchema } from "@/contracts/ai";
import type { Flashcard, GradeResult, ReviewPresentation } from "@/contracts/dto";
import type { CardGenerate, CardUpdate, GradeRequest } from "@/contracts/requests";
import type { Db } from "@/db/client";
import { cardGenerations, concepts, flashcards, reviewEvents } from "@/db/schema";
import type { ListParams } from "@/server/auth/route";
import { withAi } from "./ai-quota";
import { iso, nowOf, throwIfAborted, type Ctx } from "./context";
import { ApiFailure, conflict, notFound } from "./errors";
import { getConcept, sourceRevisionSnapshots, toConcept } from "./knowledge";
import { userTimezone } from "./profile";
import { groundedRefs } from "./sessions";

const CLAIM_STALE_MS = 2 * 60_000; // AI ops time out at 60 s; an older "running" claim belongs to a crashed request

type CardRow = typeof flashcards.$inferSelect;
const toCard = (r: CardRow): Flashcard => ({ id: r.id, conceptId: r.conceptId, studySetId: r.studySetId, front: r.front, back: r.back, sourceRefs: r.sourceRefs,
  revision: r.revision, scheduler: r.scheduler, createdAt: iso(r.createdAt), updatedAt: iso(r.updatedAt) });
/** Server-issued, bound to card + revision; ownership is checked on the card itself. Grading bumps the revision, so it is single-use. */

async function getCardRow(db: Db, userId: string, id: string) {
  const [row] = await db.select().from(flashcards).where(and(eq(flashcards.id, id), eq(flashcards.userId, userId), isNull(flashcards.deletedAt)));
  if (!row) throw notFound();
  return row;
}

export async function listCards(ctx: Ctx, q: ListParams) {
  const rows = await ctx.db.select().from(flashcards).where(and(eq(flashcards.userId, ctx.userId), isNull(flashcards.deletedAt), q.studySetId ? eq(flashcards.studySetId, q.studySetId) : undefined))
    .orderBy(desc(flashcards.updatedAt)).limit(q.limit).offset(q.offset);
  return rows.map(toCard);
}
export async function updateCard(ctx: Ctx, id: string, { expectedRevision, ...patch }: CardUpdate) {
  const where = and(eq(flashcards.id, id), eq(flashcards.userId, ctx.userId), isNull(flashcards.deletedAt));
  const [row] = await ctx.db.update(flashcards).set({ ...patch, revision: sql`${flashcards.revision} + 1`, updatedAt: nowOf(ctx) })
    .where(and(where, eq(flashcards.revision, expectedRevision))).returning();
  if (row) return toCard(row);
  throw (await ctx.db.select({ id: flashcards.id }).from(flashcards).where(where)).length ? conflict() : notFound();
}
/** Soft delete: leaves due/progress/active uniqueness; its append-only review events stay stored. */
export async function deleteCard(ctx: Ctx, id: string) {
  const [row] = await ctx.db.update(flashcards).set({ deletedAt: nowOf(ctx) }).where(and(eq(flashcards.id, id), eq(flashcards.userId, ctx.userId), isNull(flashcards.deletedAt))).returning({ id: flashcards.id });
  if (!row) throw notFound();
}

/**
 * Generates (or regenerates in place) THE generated card of an approved concept.
 * The (user, idempotencyKey) claim is taken BEFORE the AI call: same key + same payload => original card (no AI call),
 * in flight => 409, failed/stale => retried; different conceptId/expectedConceptRevision => 409.
 * unique(concept_id) guarantees one card per concept even across different keys.
 */
export async function generateCard(ctx: Ctx, input: CardGenerate) {
  const keyWhere = and(eq(cardGenerations.userId, ctx.userId), eq(cardGenerations.idempotencyKey, input.idempotencyKey));
  const findClaim = async () => (await ctx.db.select().from(cardGenerations).where(keyWhere))[0];
  const replay = async (g: typeof cardGenerations.$inferSelect) => {
    if (g.conceptId !== input.conceptId || g.expectedConceptRevision !== input.expectedConceptRevision) throw conflict("Khóa idempotency đã được dùng cho yêu cầu khác.");
    return g.status === "completed" && g.cardId ? toCard(await getCardRow(ctx.db, ctx.userId, g.cardId)) : undefined;
  };
  const assertReady = (c: typeof concepts.$inferSelect) => {
    if (c.status !== "approved") throw new ApiFailure("VALIDATION_ERROR", "Khái niệm cần được duyệt trước khi tạo thẻ.");
    if (c.revision !== input.expectedConceptRevision) throw conflict("Khái niệm đã được chỉnh sửa, vui lòng tải lại.");
  };

  const prior = await findClaim();
  const replayed = prior && await replay(prior);
  if (replayed) return replayed;
  const concept = await getConcept(ctx.db, ctx.userId, input.conceptId);
  assertReady(concept);
  const now = nowOf(ctx);
  const [claimed] = prior
    ? await ctx.db.update(cardGenerations).set({ status: "running", updatedAt: now })
      .where(and(keyWhere, or(eq(cardGenerations.status, "failed"), and(eq(cardGenerations.status, "running"), lt(cardGenerations.updatedAt, new Date(now.getTime() - CLAIM_STALE_MS)))))).returning()
    : await ctx.db.insert(cardGenerations).values({ userId: ctx.userId, idempotencyKey: input.idempotencyKey, conceptId: concept.id,
      expectedConceptRevision: input.expectedConceptRevision, status: "running", createdAt: now, updatedAt: now }).onConflictDoNothing().returning();
  if (!claimed) {
    const winner = await findClaim();
    const done = winner && await replay(winner);
    if (done) return done;
    throw conflict("Yêu cầu tạo thẻ này đang được xử lý.");
  }

  try {
    const snapshot = { ...toConcept(concept), status: "approved" as const };
    const sources = await sourceRevisionSnapshots(ctx.db, ctx.userId, concept.sourceRefs);
    const generated = aiFlashcardSchema.parse(await withAi(ctx, "flashcard", () =>
      ctx.ai.generateFlashcard({ requestId: ctx.requestId, signal: ctx.signal, sources, concepts: [snapshot], concept: snapshot })));
    const refs = groundedRefs(generated.sourceRefs, sources);
    const sourceRefs = refs.length ? refs : concept.sourceRefs;
    throwIfAborted(ctx.signal);
    return await ctx.db.transaction(async tx => {
      throwIfAborted(ctx.signal);
      const [locked] = await tx.select().from(concepts).where(and(eq(concepts.id, concept.id), eq(concepts.userId, ctx.userId), isNull(concepts.deletedAt))).for("update");
      if (!locked) throw notFound();
      assertReady(locked); // re-check: concept may have changed during the AI call
      const at = nowOf(ctx), empty = createEmptyCard(at);
      const [card] = await tx.insert(flashcards).values({ userId: ctx.userId, conceptId: concept.id, studySetId: concept.studySetId, front: generated.front, back: generated.back,
        sourceRefs, scheduler: toState(empty), due: empty.due, createdAt: at, updatedAt: at })
        .onConflictDoUpdate({ target: flashcards.conceptId, targetWhere: sql`deleted_at is null`, set: { front: generated.front, back: generated.back, sourceRefs, revision: sql`${flashcards.revision} + 1`, updatedAt: at } })
        .returning();
      await tx.update(cardGenerations).set({ status: "completed", cardId: card.id, updatedAt: at }).where(keyWhere);
      throwIfAborted(ctx.signal);
      return toCard(card);
    });
  } catch (e) {
    await ctx.db.update(cardGenerations).set({ status: "failed", updatedAt: new Date() }).where(and(keyWhere, eq(cardGenerations.status, "running")));
    throw e;
  }
}

// ---------- time zones ----------
/** Cards due before the end of the learner's local day (profile timezone). Computed on read; no cron. */
export async function dueQueue(ctx: Ctx, q: ListParams): Promise<ReviewPresentation[]> {
  const cutoff = endOfLocalDay(nowOf(ctx), await userTimezone(ctx.db, ctx.userId));
  const rows = await ctx.db.select().from(flashcards)
    .where(and(eq(flashcards.userId, ctx.userId), isNull(flashcards.deletedAt), lt(flashcards.due, cutoff), q.studySetId ? eq(flashcards.studySetId, q.studySetId) : undefined))
    .orderBy(asc(flashcards.due)).limit(q.limit).offset(q.offset);
  return rows.map(r => ({ card: toCard(r), presentationId: presentationIdOf(r.id, r.revision), expectedRevision: r.revision, dueAt: iso(r.due) }));
}

/**
 * Atomic, idempotent grade: lock card row → replay by idempotency key → verify presentation/revision → append event + update scheduler.
 * unique(card_id, revision_before) and unique(user_id, idempotency_key) back this up at the database level.
 */
export async function gradeCard(ctx: Ctx, cardId: string, input: GradeRequest): Promise<GradeResult> {
  const now = nowOf(ctx);
  return ctx.db.transaction(async tx => {
    const [card] = await tx.select().from(flashcards).where(and(eq(flashcards.id, cardId), eq(flashcards.userId, ctx.userId), isNull(flashcards.deletedAt))).for("update");
    if (!card) throw notFound();
    const [prior] = await tx.select().from(reviewEvents).where(and(eq(reviewEvents.userId, ctx.userId), eq(reviewEvents.idempotencyKey, input.idempotencyKey)));
    if (prior) {
      if (prior.cardId !== cardId || prior.presentationId !== input.presentationId || prior.rating !== input.rating) throw conflict("Khóa idempotency đã được dùng cho lượt chấm khác.");
      return { cardId, revision: prior.revisionAfter, dueAt: prior.stateAfter.due };
    }
    if (input.presentationId !== presentationIdOf(cardId, input.expectedRevision) || card.revision !== input.expectedRevision)
      throw conflict("Thẻ đã được chấm hoặc chỉnh sửa ở nơi khác.");
    const next = scheduler.next(fromState(card.scheduler), now, RATINGS[input.rating]).card;
    const stateAfter = toState(next), revisionAfter = card.revision + 1;
    await tx.insert(reviewEvents).values({ userId: ctx.userId, cardId, presentationId: input.presentationId, idempotencyKey: input.idempotencyKey, rating: input.rating,
      reviewedAt: now, revisionBefore: card.revision, revisionAfter, stateBefore: card.scheduler, stateAfter });
    await tx.update(flashcards).set({ scheduler: stateAfter, due: next.due, revision: revisionAfter, updatedAt: now }).where(eq(flashcards.id, cardId));
    return { cardId, revision: revisionAfter, dueAt: stateAfter.due };
  });
}

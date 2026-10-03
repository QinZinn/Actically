import { and, asc, desc, eq, lt, sql } from "drizzle-orm";
import { createEmptyCard, fsrs, Rating, type Card, type Grade } from "ts-fsrs";
import { aiFlashcardSchema } from "@/contracts/ai";
import type { Flashcard, GradeResult, ReviewPresentation } from "@/contracts/dto";
import type { CardGenerate, CardUpdate, GradeRequest } from "@/contracts/requests";
import type { Db } from "@/db/client";
import { cardGenerations, concepts, flashcards, reviewEvents, type FsrsState } from "@/db/schema";
import type { ListParams } from "@/server/auth/route";
import { withAi } from "./ai-quota";
import { iso, nowOf, type Ctx } from "./context";
import { ApiFailure, conflict, notFound } from "./errors";
import { getConcept, sourceRevisionSnapshots, toConcept } from "./knowledge";
import { userTimezone } from "./profile";
import { groundedRefs } from "./sessions";

const scheduler = fsrs(); // default parameters, fuzz off => deterministic
const RATINGS: Record<GradeRequest["rating"], Grade> = { again: Rating.Again, hard: Rating.Hard, good: Rating.Good, easy: Rating.Easy };

export const toState = (c: Card): FsrsState => ({ due: iso(c.due), stability: c.stability, difficulty: c.difficulty, elapsed_days: c.elapsed_days,
  scheduled_days: c.scheduled_days, learning_steps: c.learning_steps, reps: c.reps, lapses: c.lapses, state: c.state, last_review: c.last_review ? iso(c.last_review) : null });
const fromState = (s: FsrsState): Card => ({ ...s, due: new Date(s.due), last_review: s.last_review ? new Date(s.last_review) : undefined });

type CardRow = typeof flashcards.$inferSelect;
const toCard = (r: CardRow): Flashcard => ({ id: r.id, conceptId: r.conceptId, studySetId: r.studySetId, front: r.front, back: r.back, sourceRefs: r.sourceRefs,
  revision: r.revision, scheduler: r.scheduler, createdAt: iso(r.createdAt), updatedAt: iso(r.updatedAt) });
/** Server-issued, bound to card + revision; ownership is checked on the card itself. Grading bumps the revision, so it is single-use. */
export const presentationIdOf = (cardId: string, revision: number) => `${cardId}.${revision}`;

async function getCardRow(db: Db, userId: string, id: string) {
  const [row] = await db.select().from(flashcards).where(and(eq(flashcards.id, id), eq(flashcards.userId, userId)));
  if (!row) throw notFound();
  return row;
}

export async function listCards(ctx: Ctx, q: ListParams) {
  const rows = await ctx.db.select().from(flashcards).where(and(eq(flashcards.userId, ctx.userId), q.studySetId ? eq(flashcards.studySetId, q.studySetId) : undefined))
    .orderBy(desc(flashcards.updatedAt)).limit(q.limit).offset(q.offset);
  return rows.map(toCard);
}
export async function updateCard(ctx: Ctx, id: string, { expectedRevision, ...patch }: CardUpdate) {
  const where = and(eq(flashcards.id, id), eq(flashcards.userId, ctx.userId));
  const [row] = await ctx.db.update(flashcards).set({ ...patch, revision: sql`${flashcards.revision} + 1`, updatedAt: nowOf(ctx) })
    .where(and(where, eq(flashcards.revision, expectedRevision))).returning();
  if (row) return toCard(row);
  throw (await ctx.db.select({ id: flashcards.id }).from(flashcards).where(where)).length ? conflict() : notFound();
}
export async function deleteCard(ctx: Ctx, id: string) {
  const [row] = await ctx.db.delete(flashcards).where(and(eq(flashcards.id, id), eq(flashcards.userId, ctx.userId))).returning({ id: flashcards.id });
  if (!row) throw notFound();
}

/**
 * Generates (or regenerates in place) THE generated card of an approved concept.
 * Same idempotencyKey => original card, no AI call. unique(concept_id) guarantees one card per concept even under races.
 */
export async function generateCard(ctx: Ctx, input: CardGenerate) {
  const replay = async () => {
    const [g] = await ctx.db.select().from(cardGenerations).where(and(eq(cardGenerations.userId, ctx.userId), eq(cardGenerations.idempotencyKey, input.idempotencyKey)));
    if (g && g.conceptId !== input.conceptId) throw conflict("Khóa idempotency đã được dùng cho khái niệm khác.");
    return g ? toCard(await getCardRow(ctx.db, ctx.userId, g.cardId)) : undefined;
  };
  const prior = await replay();
  if (prior) return prior;
  const assertReady = (c: typeof concepts.$inferSelect) => {
    if (c.status !== "approved") throw new ApiFailure("VALIDATION_ERROR", "Khái niệm cần được duyệt trước khi tạo thẻ.");
    if (c.revision !== input.expectedConceptRevision) throw conflict("Khái niệm đã được chỉnh sửa, vui lòng tải lại.");
  };
  const concept = await getConcept(ctx.db, ctx.userId, input.conceptId);
  assertReady(concept);
  const snapshot = { ...toConcept(concept), status: "approved" as const };
  const sources = await sourceRevisionSnapshots(ctx.db, ctx.userId, concept.sourceRefs);
  const generated = aiFlashcardSchema.parse(await withAi(ctx, "flashcard", () =>
    ctx.ai.generateFlashcard({ requestId: ctx.requestId, signal: ctx.signal, sources, concepts: [snapshot], concept: snapshot })));
  const refs = groundedRefs(generated.sourceRefs, sources);
  const sourceRefs = refs.length ? refs : concept.sourceRefs;
  const now = nowOf(ctx);
  return ctx.db.transaction(async tx => {
    const [locked] = await tx.select().from(concepts).where(and(eq(concepts.id, concept.id), eq(concepts.userId, ctx.userId))).for("update");
    if (!locked) throw notFound();
    assertReady(locked); // re-check: concept may have changed during the AI call
    const empty = createEmptyCard(now);
    const [card] = await tx.insert(flashcards).values({ userId: ctx.userId, conceptId: concept.id, studySetId: concept.studySetId, front: generated.front, back: generated.back,
      sourceRefs, scheduler: toState(empty), due: empty.due, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: flashcards.conceptId, set: { front: generated.front, back: generated.back, sourceRefs, revision: sql`${flashcards.revision} + 1`, updatedAt: now } })
      .returning();
    await tx.insert(cardGenerations).values({ userId: ctx.userId, idempotencyKey: input.idempotencyKey, cardId: card.id, conceptId: concept.id }).onConflictDoNothing();
    return toCard(card);
  });
}

// ---------- time zones ----------
function zonedParts(d: Date, timeZone: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(d).map(x => [x.type, Number(x.value)]));
  return p as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>;
}
const offsetMs = (d: Date, tz: string) => { const p = zonedParts(d, tz); return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(d.getTime() / 1000) * 1000; };
/** First instant of the next local calendar day in `timeZone` (UTC Date). DST-safe via a second offset probe. */
export function endOfLocalDay(now: Date, timeZone: string) {
  const p = zonedParts(now, timeZone);
  const wall = Date.UTC(p.year, p.month - 1, p.day + 1);
  let t = wall - offsetMs(new Date(wall), timeZone);
  t = wall - offsetMs(new Date(t), timeZone);
  return new Date(t);
}

/** Cards due before the end of the learner's local day (profile timezone). Computed on read; no cron. */
export async function dueQueue(ctx: Ctx, q: ListParams): Promise<ReviewPresentation[]> {
  const cutoff = endOfLocalDay(nowOf(ctx), await userTimezone(ctx.db, ctx.userId));
  const rows = await ctx.db.select().from(flashcards)
    .where(and(eq(flashcards.userId, ctx.userId), lt(flashcards.due, cutoff), q.studySetId ? eq(flashcards.studySetId, q.studySetId) : undefined))
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
    const [card] = await tx.select().from(flashcards).where(and(eq(flashcards.id, cardId), eq(flashcards.userId, ctx.userId))).for("update");
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

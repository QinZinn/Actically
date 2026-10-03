import { and, desc, eq, inArray, lt, or } from "drizzle-orm";
import type { ConceptSnapshot, SourceSnapshot } from "@/contracts/ai";
import { evaluationResultSchema, type Finding, type PracticeAttempt, type PracticeEvaluation } from "@/contracts/dto";
import type { PracticeCreate, PracticeRetry } from "@/contracts/requests";
import type { Db } from "@/db/client";
import { practiceAttempts, practiceEvaluations } from "@/db/schema";
import type { ListParams } from "@/server/auth/route";
import { AiServiceError } from "@/server/ai/errors";
import { getAiMetadata } from "@/server/composition";
import { withAi } from "./ai-quota";
import { assertSamePayload, iso, nowOf, throwIfAborted, type Ctx } from "./context";
import { ApiFailure, conflict, isUniqueViolation, notFound } from "./errors";
import { getConcept, getStudySet, sourceRevisionSnapshots, toConcept } from "./knowledge";

const STALE_MS = 2 * 60_000;
type AttemptRow = typeof practiceAttempts.$inferSelect;
type EvaluationRow = typeof practiceEvaluations.$inferSelect;
const toAttempt = (r: AttemptRow): PracticeAttempt => ({ id: r.id, kind: r.kind, studySetId: r.studySetId, learnerText: r.learnerText,
  referenceSnapshots: r.referenceSnapshots.map(c => ({ conceptId: c.id, revision: c.revision })), status: r.status, retryOfId: r.retryOfId,
  createdAt: iso(r.createdAt), updatedAt: iso(r.updatedAt) });
const toEvaluation = (r: EvaluationRow): PracticeEvaluation => ({ id: r.id, attemptId: r.attemptId, result: r.result, promptVersion: r.promptVersion, model: r.model, createdAt: iso(r.createdAt) });

async function getAttemptRow(db: Db, userId: string, id: string) {
  const [row] = await db.select().from(practiceAttempts).where(and(eq(practiceAttempts.id, id), eq(practiceAttempts.userId, userId)));
  if (!row) throw notFound();
  return row;
}

export async function listAttempts(ctx: Ctx, q: ListParams) {
  const rows = await ctx.db.select().from(practiceAttempts)
    .where(and(eq(practiceAttempts.userId, ctx.userId), q.studySetId ? eq(practiceAttempts.studySetId, q.studySetId) : undefined))
    .orderBy(desc(practiceAttempts.createdAt)).limit(q.limit).offset(q.offset);
  return rows.map(toAttempt);
}

export async function getAttempt(ctx: Ctx, id: string) {
  const attempt = await getAttemptRow(ctx.db, ctx.userId, id);
  const [evaluation] = await ctx.db.select().from(practiceEvaluations).where(and(eq(practiceEvaluations.attemptId, id), eq(practiceEvaluations.userId, ctx.userId)));
  return { attempt: toAttempt(attempt), evaluation: evaluation ? toEvaluation(evaluation) : null };
}

/** Insert once per idempotency key; a replay with the same payload returns the original attempt. */
async function insertAttempt(ctx: Ctx, values: Omit<typeof practiceAttempts.$inferInsert, "userId">) {
  const payload = (r: { kind: string; studySetId: string; learnerText: string; retryOfId?: string | null; referenceSnapshots: ConceptSnapshot[] }) =>
    [r.kind, r.studySetId, r.learnerText, r.retryOfId ?? null, r.referenceSnapshots.map(c => [c.id, c.revision])];
  const replay = async () => {
    const [prior] = await ctx.db.select().from(practiceAttempts).where(and(eq(practiceAttempts.userId, ctx.userId), eq(practiceAttempts.idempotencyKey, values.idempotencyKey)));
    if (prior) assertSamePayload(payload(prior), payload(values));
    return prior;
  };
  const prior = await replay();
  if (prior) return toAttempt(prior);
  try {
    const [row] = await ctx.db.insert(practiceAttempts).values({ ...values, userId: ctx.userId }).returning();
    return toAttempt(row);
  } catch (e) {
    const raced = isUniqueViolation(e) ? await replay() : undefined;
    if (raced) return toAttempt(raced);
    throw e;
  }
}

/** Attempts reference APPROVED concepts at their exact current revision; full snapshots are stored before any evaluation. */
export async function createAttempt(ctx: Ctx, input: PracticeCreate) {
  await getStudySet(ctx.db, ctx.userId, input.studySetId);
  const snapshots: ConceptSnapshot[] = [];
  for (const ref of input.referenceSnapshots) {
    const c = await getConcept(ctx.db, ctx.userId, ref.conceptId);
    if (c.studySetId !== input.studySetId) throw notFound();
    if (c.status !== "approved") throw new ApiFailure("VALIDATION_ERROR", "Chỉ dùng khái niệm đã được duyệt.");
    if (c.revision !== ref.revision) throw conflict("Khái niệm đã được chỉnh sửa, vui lòng tải lại.");
    snapshots.push({ ...toConcept(c), status: "approved" });
  }
  return insertAttempt(ctx, { kind: input.kind, studySetId: input.studySetId, learnerText: input.learnerText, referenceSnapshots: snapshots, idempotencyKey: input.idempotencyKey });
}

/** Retry = a NEW attempt against the same stored snapshots, so comparisons are between real attempts on identical references. */
export async function retryAttempt(ctx: Ctx, id: string, input: PracticeRetry) {
  const original = await getAttemptRow(ctx.db, ctx.userId, id);
  return insertAttempt(ctx, { kind: original.kind, studySetId: original.studySetId, learnerText: input.learnerText,
    referenceSnapshots: original.referenceSnapshots, retryOfId: original.id, idempotencyKey: input.idempotencyKey });
}

const invalid = (why: string) => new AiServiceError("AI_INVALID_OUTPUT", `Kết quả đánh giá không hợp lệ (${why}).`, true);

/** Semantic evidence checks: learner quotes must exist verbatim, evidence must cite the attempt's snapshots and their exact source revisions. */
export function verifyFindings(findings: Finding[], learnerText: string, concepts: ConceptSnapshot[], sources: SourceSnapshot[]) {
  for (const f of findings) {
    const q = f.learnerQuote;
    if (q) {
      if (!learnerText.includes(q.text)) throw invalid("trích dẫn người học không tồn tại");
      if (q.start !== null && q.end !== null && learnerText.slice(q.start, q.end) !== q.text) throw invalid("vị trí trích dẫn sai");
    }
    for (const ev of f.evidence) {
      const c = concepts.find(s => s.id === ev.conceptId && s.revision === ev.revision);
      if (!c) throw invalid("khái niệm tham chiếu sai");
      if (!`${c.title}\n${c.body}`.includes(ev.excerpt)) throw invalid("trích đoạn khái niệm sai");
      for (const r of ev.sourceRefs)
        if (!sources.some(s => s.sourceId === r.sourceId && s.revision === r.revision && s.content.includes(r.excerpt))) throw invalid("trích dẫn nguồn sai");
    }
  }
}

export async function evaluateAttempt(ctx: Ctx, id: string) {
  const attempt = await getAttemptRow(ctx.db, ctx.userId, id);
  const existing = async () => (await ctx.db.select().from(practiceEvaluations).where(and(eq(practiceEvaluations.attemptId, id), eq(practiceEvaluations.userId, ctx.userId))))[0];
  if (attempt.status === "evaluated") return toEvaluation((await existing())!);
  const now = nowOf(ctx);
  const [claimed] = await ctx.db.update(practiceAttempts).set({ status: "evaluating", updatedAt: now })
    .where(and(eq(practiceAttempts.id, id), eq(practiceAttempts.userId, ctx.userId),
      or(inArray(practiceAttempts.status, ["submitted", "failed"]), and(eq(practiceAttempts.status, "evaluating"), lt(practiceAttempts.updatedAt, new Date(now.getTime() - STALE_MS)))))).returning();
  if (!claimed) {
    const done = await existing();
    if (done) return toEvaluation(done);
    throw conflict("Bài làm này đang được chấm.");
  }
  try {
    const concepts = attempt.referenceSnapshots;
    const sources = await sourceRevisionSnapshots(ctx.db, ctx.userId, concepts.flatMap(c => c.sourceRefs));
    const input = { requestId: ctx.requestId, signal: ctx.signal, sources, concepts, learnerText: attempt.learnerText };
    const raw: unknown = await withAi<unknown>(ctx, `evaluate-${attempt.kind}`, () => attempt.kind === "feynman" ? ctx.ai.evaluateFeynman(input) : ctx.ai.evaluateBlurting(input));
    const parsed = evaluationResultSchema.safeParse(raw);
    if (!parsed.success || parsed.data.kind !== attempt.kind) throw invalid("sai cấu trúc");
    const result = parsed.data;
    verifyFindings([...result.observations, ...(result.kind === "blurting" ? [...result.correct, ...result.missing, ...result.incorrect] : [])], attempt.learnerText, concepts, sources);
    if (result.kind === "feynman" && !result.sufficientEvidence && Object.values(result.scores).some(s => s !== null)) throw invalid("chấm điểm khi thiếu bằng chứng");
    throwIfAborted(ctx.signal);
    return await ctx.db.transaction(async tx => {
      throwIfAborted(ctx.signal);
      const [row] = await tx.insert(practiceEvaluations).values({ userId: ctx.userId, attemptId: id, result,
        promptVersion: getAiMetadata().promptVersion, model: getAiMetadata().model }).returning();
      await tx.update(practiceAttempts).set({ status: "evaluated", updatedAt: new Date() }).where(eq(practiceAttempts.id, id));
      throwIfAborted(ctx.signal);
      return toEvaluation(row);
    });
  } catch (e) {
    await ctx.db.update(practiceAttempts).set({ status: "failed", updatedAt: new Date() }).where(and(eq(practiceAttempts.id, id), eq(practiceAttempts.status, "evaluating")));
    throw e;
  }
}

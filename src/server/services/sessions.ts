import { and, asc, desc, eq, inArray, lt, ne, or } from "drizzle-orm";
import { aiExtractionSchema, type AiChatInput, type SourceSnapshot } from "@/contracts/ai";
import type { LearningSession, Message, SolveResult, SourceRef } from "@/contracts/dto";
import type { ChatRequest, ExtractionRequest, SessionCreate, SessionUpdate } from "@/contracts/requests";
import { encodeChatEvent, type ChatEvent } from "@/contracts/sse";
import type { Db } from "@/db/client";
import { concepts, extractions, learningSessions, messages } from "@/db/schema";
import type { ListParams } from "@/server/auth/route";
import { AiServiceError } from "@/server/ai/errors";
import { reserveAi, withAi } from "./ai-quota";
import { iso, normalizeTitle, nowOf, throwIfAborted, type Ctx } from "./context";
import { ApiFailure, conflict, notFound, toApiError } from "./errors";
import { approvedConceptSnapshots, contextSources, getStudySet, sourceSnapshots, toConcept } from "./knowledge";

const HISTORY_LIMIT = 24;
const STALE_MS = 2 * 60_000; // a "streaming"/"running" row older than this belongs to a crashed request

type SessionRow = typeof learningSessions.$inferSelect;
type MessageRow = typeof messages.$inferSelect;
export const toSession = (r: SessionRow): LearningSession => ({ id: r.id, studySetId: r.studySetId, title: r.title, mode: r.mode, status: r.status, createdAt: iso(r.createdAt), updatedAt: iso(r.updatedAt) });
export const toMessage = (r: MessageRow): Message => ({ id: r.id, sessionId: r.sessionId, role: r.role, content: r.content, status: r.status, solve: r.solve ?? null, requestId: r.requestId, createdAt: iso(r.createdAt), updatedAt: iso(r.updatedAt) });

export async function getSessionRow(db: Db, userId: string, id: string) {
  const [row] = await db.select().from(learningSessions).where(and(eq(learningSessions.id, id), eq(learningSessions.userId, userId)));
  if (!row) throw notFound();
  return row;
}

export async function listSessions(ctx: Ctx, q: ListParams) {
  const rows = await ctx.db.select().from(learningSessions)
    .where(and(eq(learningSessions.userId, ctx.userId), q.studySetId ? eq(learningSessions.studySetId, q.studySetId) : undefined))
    .orderBy(desc(learningSessions.updatedAt)).limit(q.limit).offset(q.offset);
  return rows.map(toSession);
}
export const getSession = async (ctx: Ctx, id: string) => toSession(await getSessionRow(ctx.db, ctx.userId, id));
export async function createSession(ctx: Ctx, input: SessionCreate) {
  if (input.studySetId) await getStudySet(ctx.db, ctx.userId, input.studySetId);
  const [row] = await ctx.db.insert(learningSessions).values({ ...input, userId: ctx.userId }).returning();
  return toSession(row);
}
export async function updateSession(ctx: Ctx, id: string, patch: SessionUpdate) {
  if (patch.studySetId) await getStudySet(ctx.db, ctx.userId, patch.studySetId);
  const [row] = await ctx.db.update(learningSessions).set({ ...patch, updatedAt: nowOf(ctx) })
    .where(and(eq(learningSessions.id, id), eq(learningSessions.userId, ctx.userId))).returning();
  if (!row) throw notFound();
  return toSession(row);
}
export async function deleteSession(ctx: Ctx, id: string) {
  const [row] = await ctx.db.delete(learningSessions).where(and(eq(learningSessions.id, id), eq(learningSessions.userId, ctx.userId))).returning({ id: learningSessions.id });
  if (!row) throw notFound();
}

async function sessionMessages(db: Db, userId: string, sessionId: string) {
  return db.select().from(messages).where(and(eq(messages.sessionId, sessionId), eq(messages.userId, userId))).orderBy(asc(messages.createdAt));
}
export async function listMessages(ctx: Ctx, sessionId: string) {
  await getSessionRow(ctx.db, ctx.userId, sessionId);
  return (await sessionMessages(ctx.db, ctx.userId, sessionId)).map(toMessage);
}

export function renderSolve(s: SolveResult) {
  const steps = s.steps.map(st => `**Bước ${st.number}: ${st.action}**\n\n${st.explanation}\n\n_Nguyên lý:_ ${st.principle}`).join("\n\n");
  return `${steps}\n\n**Kiểm tra hiểu bài:** ${s.comprehensionCheck}`;
}

const isStale = (r: { updatedAt: Date }, now: Date) => now.getTime() - r.updatedAt.getTime() > STALE_MS;
const SSE_HEADERS = { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no", Connection: "keep-alive" };

function sseResponse(run: (send: (e: ChatEvent) => void, signal: AbortSignal) => Promise<void>, outer?: AbortSignal) {
  const abort = new AbortController();
  if (outer?.aborted) abort.abort();
  else outer?.addEventListener("abort", () => abort.abort(), { once: true });
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: ChatEvent) => { try { controller.enqueue(encoder.encode(encodeChatEvent(e))); } catch { /* client gone */ } };
      try { await run(send, abort.signal); } finally { try { controller.close(); } catch { /* already closed */ } }
    },
    cancel() { abort.abort(); },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}

/**
 * POST /sessions/:id/messages/stream. User message + pending assistant are persisted BEFORE the AI call.
 * Same requestId + same content: completed → replay meta+done without AI; failed/cancelled → regenerate into the same IDs;
 * in progress → 409 (never two generations). Partial output is only ever stored as cancelled/failed.
 */
export async function streamChat(ctx: Ctx, sessionId: string, input: ChatRequest): Promise<Response> {
  const session = await getSessionRow(ctx.db, ctx.userId, sessionId);
  const pair = await ctx.db.select().from(messages).where(and(eq(messages.sessionId, sessionId), eq(messages.userId, ctx.userId), eq(messages.requestId, input.requestId)));
  const prevUser = pair.find(m => m.role === "user"), prevAssistant = pair.find(m => m.role === "assistant");
  const now = nowOf(ctx);
  if (prevUser && prevAssistant) {
    if (prevUser.content !== input.content) throw conflict("requestId đã được dùng cho nội dung khác.");
    const meta: ChatEvent = { event: "meta", data: { requestId: input.requestId, sessionId, userMessageId: prevUser.id, assistantMessageId: prevAssistant.id } };
    if (prevAssistant.status === "completed")
      return sseResponse(async send => { send(meta); send({ event: "done", data: { requestId: input.requestId, message: toMessage(prevAssistant) } }); });
    if ((prevAssistant.status === "pending" || prevAssistant.status === "streaming") && !isStale(prevAssistant, now)) throw conflict("Yêu cầu này đang được xử lý.");
  }

  const release = await reserveAi(ctx, input.mode === "solve" ? "solve" : "chat");
  let userMsg: MessageRow, assistant: MessageRow;
  try {
    ({ userMsg, assistant } = await ctx.db.transaction(async tx => {
      await tx.update(learningSessions).set({ mode: input.mode, updatedAt: now }).where(eq(learningSessions.id, session.id));
      if (prevUser && prevAssistant) {
        const [a] = await tx.update(messages).set({ status: "streaming", content: "", solve: null, updatedAt: now })
          .where(and(eq(messages.id, prevAssistant.id), ne(messages.status, "completed"), or(inArray(messages.status, ["failed", "cancelled"]), lt(messages.updatedAt, new Date(now.getTime() - STALE_MS))))).returning();
        if (!a) throw conflict("Yêu cầu này đang được xử lý.");
        return { userMsg: prevUser, assistant: a };
      }
      const [u] = await tx.insert(messages).values({ userId: ctx.userId, sessionId, role: "user", content: input.content, status: "completed", requestId: input.requestId, createdAt: now, updatedAt: now }).returning();
      const later = new Date(now.getTime() + 1); // stable ordering: user before assistant
      const [a] = await tx.insert(messages).values({ userId: ctx.userId, sessionId, role: "assistant", content: "", status: "streaming", requestId: input.requestId, createdAt: later, updatedAt: later }).returning();
      return { userMsg: u, assistant: a };
    }));
  } catch (e) { await release(); throw e; }

  const assistantWhere = and(eq(messages.id, assistant.id), eq(messages.status, "streaming"));

  // Everything after the reservation runs inside run()'s try/finally: context errors mark the answer failed and release the slot.
  return sseResponse(async (send, signal) => {
    send({ event: "meta", data: { requestId: input.requestId, sessionId, userMessageId: userMsg.id, assistantMessageId: assistant.id } });
    let partial = "";
    try {
      const history = (await sessionMessages(ctx.db, ctx.userId, sessionId))
        .filter(m => m.status === "completed" && m.requestId !== input.requestId).slice(-HISTORY_LIMIT + 1);
      const concepts = await approvedConceptSnapshots(ctx.db, ctx.userId, session.studySetId);
      const aiInput: AiChatInput = { requestId: ctx.requestId, signal, sources: await contextSources(ctx.db, ctx.userId, session.studySetId, concepts), concepts,
        mode: input.mode, followUpStep: input.followUpStep, previousSolve: input.followUpStep ? [...history].reverse().find(m => m.solve)?.solve ?? null : null,
        messages: [...history.map(m => ({ role: m.role, content: m.content })), { role: "user" as const, content: input.content }] };
      throwIfAborted(signal);
      let content: string | undefined, solve: SolveResult | null = null;
      if (input.mode === "solve") {
        solve = await ctx.ai.solve(aiInput);
        content = renderSolve(solve);
      } else {
        for await (const ev of ctx.ai.streamChat(aiInput)) {
          if (signal.aborted) break;
          if (ev.event === "delta") { partial += ev.text; send({ event: "delta", data: { requestId: input.requestId, text: ev.text } }); }
          else content = ev.content;
        }
      }
      throwIfAborted(signal);
      if (content === undefined) throw new AiServiceError("AI_INVALID_OUTPUT", "AI không trả về kết quả hoàn chỉnh.", true);
      const [done] = await ctx.db.update(messages).set({ content, solve, status: "completed", updatedAt: new Date() }).where(assistantWhere).returning();
      if (!done) throw conflict();
      send({ event: "done", data: { requestId: input.requestId, message: toMessage(done) } });
    } catch (e) {
      const status = signal.aborted || (e instanceof AiServiceError && e.code === "AI_CANCELLED") ? "cancelled" : "failed";
      await ctx.db.update(messages).set({ status, content: partial.slice(0, 32000), updatedAt: new Date() }).where(assistantWhere);
      if (!signal.aborted) send({ event: "error", data: toApiError(e, input.requestId).body.error });
    } finally {
      await release();
    }
  }, ctx.signal);
}

/** Validates AI source refs against the exact snapshots that were given to the model. */
export function groundedRefs(refs: SourceRef[], sources: SourceSnapshot[]) {
  return refs.filter(r => sources.some(s => s.sourceId === r.sourceId && s.revision === r.revision && s.content.includes(r.excerpt)));
}

/** POST /sessions/:id/finish — ends the session and extracts PENDING concepts, deduped by (user, session, idempotencyKey). */
export async function finishSession(ctx: Ctx, sessionId: string, { idempotencyKey }: ExtractionRequest) {
  const session = await getSessionRow(ctx.db, ctx.userId, sessionId);
  if (!session.studySetId) throw new ApiFailure("VALIDATION_ERROR", "Hãy chọn bộ học cho phiên này trước khi trích xuất khái niệm.");
  const key = and(eq(extractions.userId, ctx.userId), eq(extractions.sessionId, sessionId), eq(extractions.idempotencyKey, idempotencyKey));
  const [prior] = await ctx.db.select().from(extractions).where(key);
  if (prior?.status === "completed") return extractionResult(ctx, prior);
  const now = nowOf(ctx);
  let claimed;
  if (prior) {
    [claimed] = await ctx.db.update(extractions).set({ status: "running", updatedAt: now })
      .where(and(key, or(eq(extractions.status, "failed"), and(eq(extractions.status, "running"), lt(extractions.updatedAt, new Date(now.getTime() - STALE_MS)))))).returning();
  } else {
    [claimed] = await ctx.db.insert(extractions).values({ userId: ctx.userId, sessionId, idempotencyKey, status: "running" }).onConflictDoNothing().returning();
  }
  if (!claimed) throw conflict("Yêu cầu trích xuất này đang được xử lý.");

  try {
    const sources = await sourceSnapshots(ctx.db, ctx.userId, session.studySetId);
    const history = (await sessionMessages(ctx.db, ctx.userId, sessionId)).filter(m => m.status === "completed").slice(-HISTORY_LIMIT);
    const raw = await withAi(ctx, "extract", () => ctx.ai.extractConcepts({ requestId: ctx.requestId, signal: ctx.signal, sources,
      concepts: [], messages: history.map(m => ({ role: m.role, content: m.content })) }));
    const extracted = aiExtractionSchema.parse(raw);
    const existing = await ctx.db.select({ id: concepts.id, normalizedTitle: concepts.normalizedTitle }).from(concepts)
      .where(and(eq(concepts.userId, ctx.userId), eq(concepts.studySetId, session.studySetId), ne(concepts.status, "rejected")));
    const seen = new Set<string>();
    const fresh = extracted.concepts.map(c => ({ ...c, title: c.title.trim(), body: c.body.trim(), sourceRefs: groundedRefs(c.sourceRefs, sources), normalizedTitle: normalizeTitle(c.title) }))
      .filter(c => c.sourceRefs.length > 0 && !seen.has(c.normalizedTitle) && seen.add(c.normalizedTitle));
    const duplicateWarnings = fresh.flatMap(c => existing.filter(e => e.normalizedTitle === c.normalizedTitle).map(e => ({ title: c.title, existingConceptId: e.id })));
    throwIfAborted(ctx.signal);
    return await ctx.db.transaction(async tx => {
      throwIfAborted(ctx.signal);
      const rows = fresh.length ? await tx.insert(concepts).values(fresh.map(c => ({ userId: ctx.userId, studySetId: session.studySetId!, title: c.title, body: c.body,
        normalizedTitle: c.normalizedTitle, sourceRefs: c.sourceRefs, status: "pending" as const, extractionId: claimed.id }))).returning() : [];
      await tx.update(extractions).set({ status: "completed", conceptIds: rows.map(r => r.id), duplicateWarnings, updatedAt: new Date() }).where(eq(extractions.id, claimed.id));
      await tx.update(learningSessions).set({ status: "ended", updatedAt: new Date() }).where(eq(learningSessions.id, sessionId));
      throwIfAborted(ctx.signal); // rolls back if the client aborted mid-transaction
      return { concepts: rows.map(toConcept), duplicateWarnings };
    });
  } catch (e) {
    await ctx.db.update(extractions).set({ status: "failed", updatedAt: new Date() }).where(eq(extractions.id, claimed.id));
    throw e;
  }
}

async function extractionResult(ctx: Ctx, row: typeof extractions.$inferSelect) {
  const rows = row.conceptIds.length ? await ctx.db.select().from(concepts).where(and(eq(concepts.userId, ctx.userId), inArray(concepts.id, row.conceptIds))) : [];
  const byId = new Map(rows.map(r => [r.id, r]));
  return { concepts: row.conceptIds.flatMap(id => byId.has(id) ? [toConcept(byId.get(id)!)] : []), duplicateWarnings: row.duplicateWarnings };
}


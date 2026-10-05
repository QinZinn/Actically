import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import type { AiChatInput, AiChatEvent, AiPracticeInput } from "@/contracts/ai";
import type { FeynmanResult } from "@/contracts/dto";
import type { Db } from "@/db/client";
import { AiServiceError } from "@/server/ai/errors";
import { AI_WINDOW_MAX, reserveAi } from "@/server/services/ai-quota";
import * as K from "@/server/services/knowledge";
import * as S from "@/server/services/sessions";
import * as P from "@/server/services/practice";
import * as R from "@/server/services/review";
import { cardStatus, getProgress, topicStatus } from "@/server/services/progress";
import { ctxFor, createUser, fakeFlashcard, key, readSse, seedApprovedConcept, setupDb } from "./helpers";

let pg: PGlite, db: Db;
beforeAll(async () => { ({ pg, db } = await setupDb()); }, 60_000);

const chat = (content: string, requestId = key(), mode: "ask" | "socratic" | "solve" = "ask", followUpStep: number | null = null) => ({ content, mode, requestId, followUpStep });
async function* stream(...parts: (string | Error)[]): AsyncGenerator<AiChatEvent> {
  for (const p of parts) { if (p instanceof Error) throw p; yield { event: "delta", text: p }; }
  yield { event: "done", content: parts.join(""), sourceRefs: [] };
}

describe("chat SSE orchestration", () => {
  it("persists before AI, streams meta/delta/done, replays without a second AI call", async () => {
    const user = await createUser(pg);
    let calls = 0;
    const ctx = ctxFor(db, user, { streamChat: () => { calls++; return stream("Xin ", "chào"); } });
    const session = await S.createSession(ctx, { studySetId: null, title: "Hỏi nhanh", mode: "ask" });
    const req = chat("P(A|B) là gì?");
    const events = await readSse(await S.streamChat(ctx, session.id, req));
    expect(events.map(e => e.event)).toEqual(["meta", "delta", "delta", "done"]);
    expect(events[3].data.message).toMatchObject({ id: events[0].data.assistantMessageId, content: "Xin chào", status: "completed", solve: null });
    const replay = await readSse(await S.streamChat(ctx, session.id, req));
    expect(replay.map(e => e.event)).toEqual(["meta", "done"]);
    expect(replay[0].data).toEqual(events[0].data);
    expect(calls).toBe(1);
    expect((await S.listMessages(ctx, session.id)).map(m => [m.role, m.status])).toEqual([["user", "completed"], ["assistant", "completed"]]);
    await expect(S.streamChat(ctx, session.id, { ...req, content: "khác" })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("provider failure stores partial as failed; retry with the same requestId reuses both message IDs", async () => {
    const user = await createUser(pg);
    const bad = ctxFor(db, user, { streamChat: () => stream("Một phần", new AiServiceError("AI_PROVIDER_ERROR", "lỗi", true)) });
    const session = await S.createSession(bad, { studySetId: null, title: "Lỗi", mode: "socratic" });
    const req = chat("Giải thích", key(), "socratic");
    const failed = await readSse(await S.streamChat(bad, session.id, req));
    expect(failed.map(e => e.event)).toEqual(["meta", "delta", "error"]);
    expect(failed[2].data).toMatchObject({ code: "AI_PROVIDER_ERROR", retryable: true, requestId: req.requestId });
    expect((await S.listMessages(bad, session.id))[1]).toMatchObject({ status: "failed", content: "Một phần" });
    const ok = await readSse(await S.streamChat(ctxFor(db, user, { streamChat: () => stream("Đầy đủ") }), session.id, req));
    expect(ok[0].data).toEqual(failed[0].data);
    const msgs = await S.listMessages(bad, session.id);
    expect(msgs).toHaveLength(2);
    expect(msgs[1]).toMatchObject({ status: "completed", content: "Đầy đủ" });
  });

  it("unconfigured AI emits an explicit error and never a completed answer", async () => {
    const ctx = ctxFor(db, await createUser(pg));
    const session = await S.createSession(ctx, { studySetId: null, title: "x", mode: "ask" });
    const events = await readSse(await S.streamChat(ctx, session.id, chat("hi")));
    expect(events.map(e => e.event)).toEqual(["meta", "error"]);
    expect(events[1].data.code).toBe("AI_NOT_CONFIGURED");
    expect((await S.listMessages(ctx, session.id))[1].status).toBe("failed");
  });

  it("client abort marks the answer cancelled and emits no done", async () => {
    const abort = new AbortController();
    const ctx = { ...ctxFor(db, await createUser(pg), { async *streamChat() { yield { event: "delta" as const, text: "Đang" }; abort.abort(); yield { event: "delta" as const, text: " nữa" }; } }), signal: abort.signal };
    const session = await S.createSession(ctx, { studySetId: null, title: "x", mode: "ask" });
    const events = await readSse(await S.streamChat(ctx, session.id, chat("hi")));
    expect(events.map(e => e.event)).not.toContain("done");
    expect((await S.listMessages(ctx, session.id))[1]).toMatchObject({ status: "cancelled", content: "Đang" });
  });

  it("an in-flight request cannot be started twice", async () => {
    let release!: () => void;
    const gate = new Promise<void>(r => { release = r; });
    const ctx = ctxFor(db, await createUser(pg), { async *streamChat() { await gate; yield { event: "done" as const, content: "xong", sourceRefs: [] }; } });
    const session = await S.createSession(ctx, { studySetId: null, title: "x", mode: "ask" });
    const req = chat("hi");
    const first = await S.streamChat(ctx, session.id, req);
    await expect(S.streamChat(ctx, session.id, req)).rejects.toMatchObject({ code: "CONFLICT" });
    release();
    expect((await readSse(first)).at(-1)?.event).toBe("done");
  });

  it.each([false, true])("durable cancel fences a late generation and delayed cancel from its retry (old failure: %s)", async oldFails => {
    const frozen = new Date("2030-01-01T00:00:00.000Z");
    let releaseOld!: () => void, releaseNew!: () => void, started!: () => void;
    const oldGate = new Promise<void>(r => { releaseOld = r; }), newGate = new Promise<void>(r => { releaseNew = r; });
    const running = new Promise<void>(r => { started = r; });
    const user = await createUser(pg);
    const oldCtx = ctxFor(db, user, { async *streamChat() {
      started(); await oldGate;
      if (oldFails) throw new AiServiceError("AI_PROVIDER_ERROR", "old failure", true);
      yield { event: "done" as const, content: "Old answer", sourceRefs: [] };
    } }, () => frozen);
    const session = await S.createSession(oldCtx, { studySetId: null, title: "Cancel race", mode: "ask" }), req = chat("hi");
    const oldResponse = await S.streamChat(oldCtx, session.id, req);
    await running;
    const cancel = { requestId: req.requestId, generationAt: oldResponse.headers.get("X-Actically-Generation")! };
    await expect(S.cancelChat(ctxFor(db, await createUser(pg)), session.id, cancel)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const cancelled = await S.cancelChat(oldCtx, session.id, cancel);
    expect(cancelled.status).toBe("cancelled");
    expect(await S.cancelChat(oldCtx, session.id, cancel)).toEqual(cancelled);
    expect(new Date(cancelled.updatedAt).getTime()).toBeGreaterThan(new Date(cancel.generationAt).getTime());

    const newCtx = ctxFor(db, user, { async *streamChat() { await newGate; yield { event: "done" as const, content: "New answer", sourceRefs: [] }; } }, () => frozen);
    const retry = await S.streamChat(newCtx, session.id, req);
    expect(new Date(retry.headers.get("X-Actically-Generation")!).getTime()).toBeGreaterThan(new Date(cancelled.updatedAt).getTime());
    await expect(S.cancelChat(oldCtx, session.id, cancel)).rejects.toMatchObject({ code: "CONFLICT" });
    releaseOld();
    expect((await readSse(oldResponse)).map(e => e.event)).not.toContain("done");
    expect((await S.listMessages(newCtx, session.id))[1]).toMatchObject({ id: cancelled.id, status: "streaming", content: "" });
    releaseNew();
    const completed = (await readSse(retry)).at(-1)!.data.message;
    expect(completed).toMatchObject({ id: cancelled.id, status: "completed", content: "New answer" });
    expect(await S.cancelChat(newCtx, session.id, cancel)).toEqual(completed); // completion wins, never overwritten
    expect(await S.listMessages(newCtx, session.id)).toHaveLength(2);
  });

  it("rejects a delayed retry claim after another generation was started and cancelled", async () => {
    const user = await createUser(pg), frozen = new Date("2030-01-01T00:00:00.000Z");
    let finishOld!: () => void, resumeClaim!: () => void, claimStarted!: () => void, finishNew!: () => void;
    const oldGate = new Promise<void>(r => { finishOld = r; }), claimGate = new Promise<void>(r => { resumeClaim = r; });
    const staged = new Promise<void>(r => { claimStarted = r; }), newGate = new Promise<void>(r => { finishNew = r; });
    const ctx = ctxFor(db, user, { async *streamChat() { await oldGate; yield { event: "done" as const, content: "old", sourceRefs: [] }; } }, () => frozen);
    const session = await S.createSession(ctx, { studySetId: null, title: "Stale claim", mode: "ask" }), req = chat("hi");
    const original = await S.streamChat(ctx, session.id, req);
    await S.cancelChat(ctx, session.id, { requestId: req.requestId, generationAt: original.headers.get("X-Actically-Generation")! });
    finishOld(); await readSse(original); // release the old provider's quota before two retry reservations

    let transactionCount = 0, unexpectedCalls = 0;
    const delayedDb = new Proxy(db, { get(target, property) {
      if (property === "transaction") return async (...args: Parameters<Db["transaction"]>) => {
        if (++transactionCount === 2) { claimStarted(); await claimGate; }
        return target.transaction(...args);
      };
      const value = Reflect.get(target, property);
      return typeof value === "function" ? value.bind(target) : value;
    } });
    const delayed = S.streamChat(ctxFor(delayedDb, user, { streamChat: () => { unexpectedCalls++; return stream("stale"); } }, () => frozen), session.id, req);
    const checked = expect(delayed).rejects.toMatchObject({ code: "CONFLICT" });
    await staged;
    const winner = await S.streamChat(ctxFor(db, user, { async *streamChat() { await newGate; yield { event: "done" as const, content: "new", sourceRefs: [] }; } }, () => frozen), session.id, req);
    await S.cancelChat(ctx, session.id, { requestId: req.requestId, generationAt: winner.headers.get("X-Actically-Generation")! });
    resumeClaim(); await checked;
    expect(unexpectedCalls).toBe(0);
    finishNew(); await readSse(winner);
    expect((await S.listMessages(ctx, session.id))[1].status).toBe("cancelled");
  });

  it("Solve returns structured steps; follow-up receives the previous solve", async () => {
    const user = await createUser(pg);
    const seen: AiChatInput[] = [];
    const solve = { steps: [{ number: 1, action: "Xác định P(B)", explanation: "P(B) = 0,5", principle: "Định nghĩa" }], comprehensionCheck: "Vì sao cần P(B) > 0?", sourceRefs: [] };
    const ctx = ctxFor(db, user, { solve: async input => { seen.push(input); return solve; } });
    const session = await S.createSession(ctx, { studySetId: null, title: "Giải", mode: "solve" });
    const events = await readSse(await S.streamChat(ctx, session.id, chat("Tính P(A|B)", key(), "solve")));
    expect(events.at(-1)?.data.message).toMatchObject({ solve, status: "completed" });
    expect(events.at(-1)?.data.message.content).toContain("Bước 1");
    await readSse(await S.streamChat(ctx, session.id, chat("Giải thích bước 1", key(), "solve", 1)));
    expect(seen[1].previousSolve).toEqual(solve);
    expect(seen[1].messages.at(-1)).toEqual({ role: "user", content: "Giải thích bước 1" });
  });
});

describe("finish → extraction", () => {
  it("creates only PENDING, grounded concepts; warns on duplicates; dedupes by idempotency key", async () => {
    const user = await createUser(pg);
    const { set, src, concept } = await seedApprovedConcept(ctxFor(db, user));
    let calls = 0;
    const ctx = ctxFor(db, user, { extractConcepts: async () => { calls++; return { sufficientEvidence: true, concepts: [
      { title: "Biến cố độc lập", body: "P(A∩B) = P(A)P(B)", sourceRefs: [{ sourceId: src.id, revision: 1, excerpt: "P(A∩B) = P(A)P(B)" }] },
      { title: "Bịa đặt", body: "x", sourceRefs: [{ sourceId: src.id, revision: 1, excerpt: "không có trong nguồn" }] },
      { title: "  XÁC SUẤT có điều kiện ", body: "trùng", sourceRefs: [{ sourceId: src.id, revision: 1, excerpt: "P(A|B)" }] },
    ] }; } });
    const loose = await S.createSession(ctx, { studySetId: null, title: "x", mode: "ask" });
    await expect(S.finishSession(ctx, loose.id, { idempotencyKey: key() })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const session = await S.createSession(ctx, { studySetId: set.id, title: "Học", mode: "socratic" });
    const k = key();
    const result = await S.finishSession(ctx, session.id, { idempotencyKey: k });
    expect(result.concepts.map(c => [c.title, c.status])).toEqual([["Biến cố độc lập", "pending"], ["XÁC SUẤT có điều kiện", "pending"]]);
    expect(result.duplicateWarnings).toEqual([{ title: "XÁC SUẤT có điều kiện", existingConceptId: concept.id }]);
    expect(await S.finishSession(ctx, session.id, { idempotencyKey: k })).toEqual(result);
    expect(calls).toBe(1);
    expect((await S.getSession(ctx, session.id)).status).toBe("ended");
  });
});

describe("practice attempts and evaluations", () => {
  const feynman = (input: AiPracticeInput, quote: string, sufficient = true): FeynmanResult => ({ kind: "feynman", sufficientEvidence: sufficient, summary: "Nhận xét",
    scores: sufficient ? { clarity: 7, completeness: 6, accuracy: 8 } : { clarity: null, completeness: null, accuracy: null },
    observations: [{ text: "Thiếu điều kiện P(B) > 0", learnerQuote: { text: quote, start: null, end: null },
      evidence: [{ conceptId: input.concepts[0].id, revision: input.concepts[0].revision, excerpt: "P(B) > 0", sourceRefs: [{ sourceId: input.sources[0].sourceId, revision: 1, excerpt: "P(A|B)" }] }] }] });

  it("preserves the attempt before AI; validates evidence; snapshots survive concept edits; retry is a new attempt", async () => {
    const user = await createUser(pg);
    const { set, concept } = await seedApprovedConcept(ctxFor(db, user));
    const text = "Xác suất A khi biết B bằng P(A∩B) chia P(B).";
    const k = key();
    const input = { kind: "feynman" as const, studySetId: set.id, learnerText: text, referenceSnapshots: [{ conceptId: concept.id, revision: concept.revision }], idempotencyKey: k };
    const none = ctxFor(db, user);
    const attempt = await P.createAttempt(none, input);
    expect(await P.createAttempt(none, input)).toEqual(attempt);
    await expect(P.createAttempt(none, { ...input, learnerText: "khác" })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(P.evaluateAttempt(none, attempt.id)).rejects.toMatchObject({ code: "AI_NOT_CONFIGURED" });
    expect(await P.getAttempt(none, attempt.id)).toMatchObject({ attempt: { status: "failed", learnerText: text }, evaluation: null });

    await K.updateConcept(none, concept.id, { body: "Nội dung mới", expectedRevision: concept.revision });
    await expect(P.createAttempt(none, { ...input, idempotencyKey: key() })).rejects.toMatchObject({ code: "CONFLICT" });

    await expect(P.evaluateAttempt(ctxFor(db, user, { evaluateFeynman: async i => feynman(i, "câu không tồn tại") }), attempt.id)).rejects.toMatchObject({ code: "AI_INVALID_OUTPUT" });
    await expect(P.evaluateAttempt(ctxFor(db, user, { evaluateFeynman: async i => ({ ...feynman(i, "chia P(B)"), sufficientEvidence: false }) }), attempt.id)).rejects.toMatchObject({ code: "AI_INVALID_OUTPUT" });

    const seen: AiPracticeInput[] = [];
    const good = ctxFor(db, user, { evaluateFeynman: async i => { seen.push(i); return feynman(i, "chia P(B)"); } });
    const evaluation = await P.evaluateAttempt(good, attempt.id);
    expect(seen[0].concepts[0].body).toBe(concept.body); // historical snapshot, not the edited body
    expect(seen[0].sources[0].revision).toBe(1);
    expect(await P.evaluateAttempt(good, attempt.id)).toEqual(evaluation);
    expect(seen).toHaveLength(1);
    expect(await P.getAttempt(good, attempt.id)).toMatchObject({ attempt: { status: "evaluated" }, evaluation: { id: evaluation.id } });

    const retry = await P.retryAttempt(good, attempt.id, { learnerText: "Lần hai", idempotencyKey: key() });
    expect(retry).toMatchObject({ retryOfId: attempt.id, status: "submitted", referenceSnapshots: attempt.referenceSnapshots });
    expect(retry.id).not.toBe(attempt.id);
  });

  it("insufficient evidence keeps scores null", async () => {
    const user = await createUser(pg);
    const { set, concept } = await seedApprovedConcept(ctxFor(db, user));
    const ctx = ctxFor(db, user, { evaluateFeynman: async i => feynman(i, "ngắn", false) });
    const attempt = await P.createAttempt(ctx, { kind: "feynman", studySetId: set.id, learnerText: "ngắn", referenceSnapshots: [{ conceptId: concept.id, revision: concept.revision }], idempotencyKey: key() });
    const ev = await P.evaluateAttempt(ctx, attempt.id);
    expect(ev.result).toMatchObject({ sufficientEvidence: false, scores: { clarity: null, completeness: null, accuracy: null } });
  });
});

describe("persistent per-user AI rate limit", () => {
  it(`allows ${AI_WINDOW_MAX} operations per 10 minutes and 2 in flight, per user`, async () => {
    const user = await createUser(pg), other = await createUser(pg);
    let now = new Date("2026-10-03T00:00:00Z");
    const ctx = ctxFor(db, user, {}, () => now);
    const a = await reserveAi(ctx, "t"), b = await reserveAi(ctx, "t");
    await expect(reserveAi(ctx, "t")).rejects.toMatchObject({ code: "RATE_LIMITED" });
    await (await reserveAi(ctxFor(db, other, {}, () => now), "t"))();
    await a(); await b();
    for (let i = 2; i < AI_WINDOW_MAX; i++) await (await reserveAi(ctx, "t"))();
    await expect(reserveAi(ctx, "t")).rejects.toMatchObject({ code: "RATE_LIMITED" });
    now = new Date(now.getTime() + 10 * 60_000 + 1);
    await (await reserveAi(ctx, "t"))();
  });
});

describe("progress policy reviews-v1", () => {
  it("card and topic rules", () => {
    expect(cardStatus([])).toBe("nodata");
    expect(cardStatus(["again", "good", "again"])).toBe("weak");
    expect(cardStatus(["good", "good", "good", "good"])).toBe("growing"); // needs five reviews
    expect(cardStatus(["good", "easy", "good", "hard", "good"])).toBe("solid");
    expect(cardStatus(["good", "good", "good", "good", "again"])).toBe("growing");
    expect(cardStatus(["good", "good", "good", "good", "good", "again", "again"])).toBe("solid"); // only the last five count
    expect(topicStatus([])).toBe("nodata");
    expect(topicStatus(["nodata", "nodata"])).toBe("nodata");
    expect(topicStatus(["solid", "solid"])).toBe("growing"); // fewer than three cards
    expect(topicStatus(["solid", "solid", "solid"])).toBe("solid");
    expect(topicStatus(["solid", "solid", "nodata"])).toBe("growing");
    expect(topicStatus(["solid", "weak", "solid"])).toBe("weak");
  });

  it("is computed from persisted review events; AI observations stay separate", async () => {
    const user = await createUser(pg);
    const { set, src, concept } = await seedApprovedConcept(ctxFor(db, user));
    const ctx = ctxFor(db, user, fakeFlashcard(src.id));
    const progressOf = async () => (await getProgress(ctx)).find(p => p.studySetId === set.id)!;
    expect(await progressOf()).toMatchObject({ status: "nodata", totalCardCount: 0, reviewCount: 0, latestAssessmentAt: null, policyVersion: "reviews-v1" });
    const card = await R.generateCard(ctx, { conceptId: concept.id, expectedConceptRevision: concept.revision, idempotencyKey: key() });
    let rev = card.revision;
    const grade = async (rating: "again" | "good") => { rev = (await R.gradeCard(ctx, card.id, { presentationId: R.presentationIdOf(card.id, rev), idempotencyKey: key(), expectedRevision: rev, rating })).revision; };
    await grade("good");
    expect(await progressOf()).toMatchObject({ status: "growing", eligibleCardCount: 1, totalCardCount: 1, reviewCount: 1 });
    await grade("again"); await grade("again");
    const weak = await progressOf();
    expect(weak).toMatchObject({ status: "weak", reviewCount: 3 });
    expect(weak.reviewEvidence.map(e => e.rating)).toEqual(["again", "again", "good"]);
    expect(weak.latestAssessmentAt).not.toBeNull();
    expect(weak.assessmentObservations).toEqual([]);
  });
});

describe("auth callback redirect", () => {
  it("only allows same-origin relative paths", async () => {
    const { safeNext } = await import("@/server/auth/redirect");
    expect(safeNext("/review?x=1")).toBe("/review?x=1");
    for (const bad of [null, "", "https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)"]) expect(safeNext(bad)).toBe("/");
  });
});

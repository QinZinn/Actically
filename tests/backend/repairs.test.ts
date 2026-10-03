import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import type { AiChatInput, AiLearningService } from "@/contracts/ai";
import type { Db } from "@/db/client";
import { AiServiceError } from "@/server/ai/errors";
import { validateContext } from "@/server/ai/validation";
import { readBody } from "@/server/auth/route";
import { studySetCreateSchema } from "@/contracts/requests";
import * as K from "@/server/services/knowledge";
import * as S from "@/server/services/sessions";
import * as P from "@/server/services/practice";
import * as R from "@/server/services/review";
import { ctxFor, createUser, fakeFlashcard, key, readSse, seedApprovedConcept, setupDb } from "./helpers";

let pg: PGlite, db: Db;
beforeAll(async () => { ({ pg, db } = await setupDb()); }, 60_000);
const list = { limit: 50, offset: 0 };
const chat = (content: string) => ({ content, mode: "ask" as const, requestId: key(), followUpStep: null });
const done = (content: string) => ({ async *streamChat() { yield { event: "done" as const, content, sourceRefs: [] }; } });

describe("CODEX-BE-002 chat context keeps historical source revisions", () => {
  it("passes provider context validation after the cited source is edited and then deleted", async () => {
    const user = await createUser(pg);
    const seen: AiChatInput[] = [];
    const ctx = ctxFor(db, user, { async *streamChat(input) { validateContext(input); seen.push(input); yield { event: "done", content: "ok", sourceRefs: [] }; } });
    const { set, src } = await seedApprovedConcept(ctx);
    await K.updateSource(ctx, src.id, { content: "Nội dung đã sửa hoàn toàn.", expectedRevision: 1 });
    const session = await S.createSession(ctx, { studySetId: set.id, title: "x", mode: "ask" });
    expect((await readSse(await S.streamChat(ctx, session.id, chat("a")))).at(-1)?.event).toBe("done");
    expect(seen[0].sources.map(s => `${s.sourceId}@${s.revision}`).sort()).toEqual([`${src.id}@1`, `${src.id}@2`].sort());
    await K.deleteSource(ctx, src.id);
    expect((await readSse(await S.streamChat(ctx, session.id, chat("b")))).at(-1)?.event).toBe("done");
    expect(seen[1].sources.map(s => `${s.sourceId}@${s.revision}`)).toEqual([`${src.id}@1`]);
  });
});

describe("CODEX-BE-003 cancellation and cleanup", () => {
  const released = async (user: string) => (await pg.query<{ open: number }>("select count(*)::int as open from ai_reservations where user_id = $1 and released_at is null", [user])).rows[0].open;

  it("already-aborted request: no AI call, assistant cancelled, slot released", async () => {
    const user = await createUser(pg);
    let calls = 0;
    const abort = new AbortController(); abort.abort();
    const ctx = { ...ctxFor(db, user, { async *streamChat() { calls++; yield { event: "done" as const, content: "x", sourceRefs: [] }; } }), signal: abort.signal };
    const session = await S.createSession(ctx, { studySetId: null, title: "x", mode: "ask" });
    const events = await readSse(await S.streamChat(ctx, session.id, chat("hi")));
    expect(events.map(e => e.event)).toEqual(["meta"]);
    expect(calls).toBe(0);
    expect((await S.listMessages(ctx, session.id))[1].status).toBe("cancelled");
    expect(await released(user)).toBe(0);
  });

  it("context preparation failure marks the answer failed and releases the quota slot", async () => {
    const user = await createUser(pg);
    let selects = 0;
    // 3rd db.select() is the history load inside the stream (1: session, 2: requestId pair)
    const flaky = new Proxy(db, { get(t, p) {
      if (p === "select" && ++selects === 3) return () => { throw new Error("db down"); };
      const v = Reflect.get(t, p); return typeof v === "function" ? v.bind(t) : v;
    } });
    const ctx = ctxFor(flaky, user, done("x"));
    const session = await S.createSession(ctx, { studySetId: null, title: "x", mode: "ask" });
    const events = await readSse(await S.streamChat(ctx, session.id, chat("hi")));
    expect(events.map(e => e.event)).toEqual(["meta", "error"]);
    expect(events[1].data.code).toBe("INTERNAL_ERROR");
    expect((await S.listMessages(ctxFor(db, user), session.id))[1].status).toBe("failed");
    expect(await released(user)).toBe(0);
  });

  it("abort during evaluate / extract / generate persists no success", async () => {
    const user = await createUser(pg);
    const { set, src, concept } = await seedApprovedConcept(ctxFor(db, user));
    const plain = ctxFor(db, user);
    // AI "succeeds" but the client aborted meanwhile
    const aborting = (ai: (abort: () => void) => Partial<AiLearningService>) => { const a = new AbortController(); return { ...ctxFor(db, user, ai(() => a.abort())), signal: a.signal }; };

    const attempt = await P.createAttempt(plain, { kind: "feynman", studySetId: set.id, learnerText: "x", referenceSnapshots: [{ conceptId: concept.id, revision: concept.revision }], idempotencyKey: key() });
    await expect(P.evaluateAttempt(aborting(abort => ({ evaluateFeynman: async () => { abort();
      return { kind: "feynman", sufficientEvidence: false, summary: "x", observations: [], scores: { clarity: null, completeness: null, accuracy: null } }; } })), attempt.id))
      .rejects.toMatchObject({ code: "AI_CANCELLED" });
    expect(await P.getAttempt(plain, attempt.id)).toMatchObject({ evaluation: null, attempt: { status: "failed" } });

    const session = await S.createSession(plain, { studySetId: set.id, title: "x", mode: "ask" });
    await expect(S.finishSession(aborting(abort => ({ extractConcepts: async () => { abort();
      return { sufficientEvidence: true, concepts: [{ title: "Mới", body: "b", sourceRefs: [{ sourceId: src.id, revision: 1, excerpt: "P(A|B)" }] }] }; } })), session.id, { idempotencyKey: key() }))
      .rejects.toMatchObject({ code: "AI_CANCELLED" });
    expect((await S.getSession(plain, session.id)).status).toBe("active");
    expect(await K.listConcepts(plain, { ...list, studySetId: set.id, status: "pending" })).toEqual([]);

    await expect(R.generateCard(aborting(abort => ({ generateFlashcard: async input => { abort(); return fakeFlashcard(src.id).generateFlashcard!(input); } })),
      { conceptId: concept.id, expectedConceptRevision: concept.revision, idempotencyKey: key() })).rejects.toMatchObject({ code: "AI_CANCELLED" });
    expect(await R.listCards(plain, { ...list, studySetId: set.id })).toEqual([]);
  });
});

describe("CODEX-BE-004 bounded request bodies", () => {
  const streamed = (chunks: Uint8Array[], onPull: () => void) => new Request("http://x/api", { method: "POST", duplex: "half",
    body: new ReadableStream<Uint8Array>({ pull(c) { onPull(); const next = chunks.shift(); if (next) c.enqueue(next); else c.close(); } }) } as RequestInit);

  it("rejects a chunked body over 128 KiB without reading the rest", async () => {
    let pulls = 0;
    const chunks = Array.from({ length: 64 }, () => new Uint8Array(16 * 1024).fill(32)); // 1 MiB total, no Content-Length
    await expect(readBody(streamed(chunks, () => pulls++), studySetCreateSchema)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(pulls).toBeLessThan(12);
  });

  it("accepts normal JSON, rejects malformed UTF-8/JSON and unknown keys", async () => {
    const body = (s: string | Uint8Array) => new Request("http://x/api", { method: "POST", body: s as BodyInit });
    expect(await readBody(body(JSON.stringify({ subject: "Toán", title: "Xác suất", description: "" })), studySetCreateSchema)).toEqual({ subject: "Toán", title: "Xác suất", description: "" });
    await expect(readBody(body(new Uint8Array([0x7b, 0xff, 0x7d])), studySetCreateSchema)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(readBody(body("{"), studySetCreateSchema)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(readBody(body(JSON.stringify({ subject: "a", title: "b", description: "", userId: "forged" })), studySetCreateSchema)).rejects.toThrow();
  });
});

describe("CODEX-BE-005 card generation key is claimed before AI", () => {
  it("concurrent identical keys call AI once; payload mismatch is 409; failed claims are retryable", async () => {
    const user = await createUser(pg);
    const { set, src, concept } = await seedApprovedConcept(ctxFor(db, user));
    let calls = 0, release!: () => void;
    const gate = new Promise<void>(r => { release = r; });
    const slow = ctxFor(db, user, { generateFlashcard: async input => { calls++; await gate; return fakeFlashcard(src.id).generateFlashcard!(input); } });
    const req = { conceptId: concept.id, expectedConceptRevision: concept.revision, idempotencyKey: key() };
    const settled = Promise.allSettled([R.generateCard(slow, req), R.generateCard(slow, req)]);
    await new Promise(r => setTimeout(r, 50));
    release();
    const results = await settled;
    expect(calls).toBe(1);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(r => r.status === "rejected").map(r => (r as PromiseRejectedResult).reason.code)).toEqual(["CONFLICT"]);
    const card = (results.find(r => r.status === "fulfilled") as PromiseFulfilledResult<{ id: string; revision: number }>).value;
    expect(await R.generateCard(slow, req)).toMatchObject({ id: card.id, revision: 1 });
    expect(calls).toBe(1);
    await expect(R.generateCard(slow, { ...req, expectedConceptRevision: concept.revision + 1 })).rejects.toMatchObject({ code: "CONFLICT" });

    const k = key();
    const failing = ctxFor(db, user, { generateFlashcard: async () => { throw new AiServiceError("AI_PROVIDER_ERROR", "x", true); } });
    await expect(R.generateCard(failing, { ...req, idempotencyKey: k })).rejects.toMatchObject({ code: "AI_PROVIDER_ERROR" });
    expect(await R.generateCard(ctxFor(db, user, fakeFlashcard(src.id)), { ...req, idempotencyKey: k })).toMatchObject({ id: card.id, revision: 2 });
    expect(await R.listCards(slow, { ...list, studySetId: set.id })).toHaveLength(1);
  });
});

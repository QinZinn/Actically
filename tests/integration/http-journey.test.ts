import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { z } from "zod";
import { conceptSchema, extractionResultSchema, flashcardSchema, gradeResultSchema, practiceAttemptSchema, practiceDetailSchema, practiceEvaluationSchema, reviewPresentationSchema, sessionSchema, sourceSchema, studySetSchema, topicProgressSchema } from "@/contracts/dto";
import { NebiusLearningService } from "@/server/ai/nebius";
import { createUser, readSse, setupDb } from "../backend/helpers";
import { mockNebiusTransport } from "./mock-nebius";

const state = vi.hoisted(() => ({ userId: null as string | null, db: null as unknown, ai: null as unknown }));
vi.mock("@/server/auth/session", async () => {
  const { ApiFailure } = await import("@/server/services/errors");
  return { requireUser: async () => {
    if (!state.userId) throw new ApiFailure("UNAUTHENTICATED", "Vui lòng đăng nhập.");
    return { id: state.userId, email: null };
  } };
});
vi.mock("@/db/client", () => ({ getDb: () => state.db }));
vi.mock("@/server/composition", () => ({
  getAiLearningService: () => state.ai,
  getAiMetadata: () => ({ configured: true, model: "nvidia/test-nemotron", promptVersion: "actically-learning-v1" }),
}));
import { routeFetch } from "./route-fetch";
import HttpAdapter from "@/lib/client/httpAdapter";
import type { ChatRequest } from "@/contracts/requests";

let database: Awaited<ReturnType<typeof setupDb>>;
const transport = mockNebiusTransport();
beforeAll(async () => {
  vi.stubGlobal("fetch", routeFetch);
  database = await setupDb(); state.db = database.db;
  state.userId = await createUser(database.pg);
  state.ai = new NebiusLearningService({ apiKey: "synthetic-test-only", model: transport.model, fetch: transport.fetcher });
}, 30000);
afterAll(async () => { vi.unstubAllGlobals(); await database?.pg.close(); });

async function call(path: string, method = "GET", body?: unknown) {
  return routeFetch(`/api/v1/${path}`, { method, headers: { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function data<T>(path: string, schema: z.ZodType<T>, method = "GET", body?: unknown): Promise<T> {
  const response = await call(path, method, body);
  const json = await response.json(); expect(response.status, JSON.stringify(json)).toBe(200);
  return schema.parse(json.data);
}

it("persists the real HTTP/auth-shim/PostgreSQL/provider-validated learning loop", async () => {
  const set = await data("study-sets", studySetSchema, "POST", { subject: "Xác suất", title: "Ôn xác suất", description: "Synthetic integration fixture" });
  const source = await data(`study-sets/${set.id}/sources`, sourceSchema, "POST", { title: "Tài liệu", content: "Với P(B) > 0, P(A|B) = P(A ∩ B) / P(B)." });
  const session = await data("sessions", sessionSchema, "POST", { studySetId: set.id, title: "Socratic xác suất", mode: "socratic" });
  const payload = { content: "Em cần hiểu xác suất có điều kiện.", mode: "socratic", requestId: crypto.randomUUID(), followUpStep: null };
  const events = await readSse(await call(`sessions/${session.id}/messages/stream`, "POST", payload));
  expect(events.map(e => e.event)).toContain("delta"); expect(events.at(-1)?.event).toBe("done");
  const done = events.at(-1)!.data.message;
  expect(done.requestContext).toEqual({ mode: "socratic", followUpStep: null });
  const beforeReplay = transport.calls.length;
  expect((await readSse(await call(`sessions/${session.id}/messages/stream`, "POST", payload))).at(-1)!.data.message.id).toBe(done.id);
  expect(transport.calls).toHaveLength(beforeReplay);
  expect((await call(`sessions/${session.id}/messages/stream`, "POST", { ...payload, mode: "ask" })).status).toBe(409);
  const extracted = await data(`sessions/${session.id}/finish`, extractionResultSchema, "POST", { idempotencyKey: crypto.randomUUID() });
  expect(extracted.concepts).toHaveLength(1); expect(extracted.concepts[0].status).toBe("pending");
  const approved = await data(`concepts/${extracted.concepts[0].id}`, conceptSchema, "PATCH", { status: "approved", expectedRevision: extracted.concepts[0].revision });
  const card = await data("cards/generate", flashcardSchema, "POST", { conceptId: approved.id, expectedConceptRevision: approved.revision, idempotencyKey: crypto.randomUUID() });
  const queue = await data("review/due", z.array(reviewPresentationSchema));
  const presentation = queue.find(p => p.card.id === card.id)!; expect(presentation).toBeDefined();
  await data(`cards/${card.id}/grade`, gradeResultSchema, "POST", { presentationId: presentation.presentationId, expectedRevision: presentation.expectedRevision, rating: "good", idempotencyKey: crypto.randomUUID() });
  const progress = await data("progress", z.array(topicProgressSchema));
  expect(progress[0]).toMatchObject({ studySetId: set.id, reviewCount: 1, status: "growing" });
  const references = [{ conceptId: approved.id, revision: approved.revision }];
  const solveSession = await data("sessions", sessionSchema, "POST", { studySetId: set.id, title: "Giải bài xác suất", mode: "solve" });
  const solved = await readSse(await call(`sessions/${solveSession.id}/messages/stream`, "POST", { content: "Giải bài xác suất có điều kiện.", mode: "solve", requestId: crypto.randomUUID(), followUpStep: null }));
  expect(solved.at(-1)!.data.message.solve.steps[0].number).toBe(1);
  const followUp = { content: "Giải thích thêm bước 1.", mode: "ask", requestId: crypto.randomUUID(), followUpStep: 1 };
  const explained = await readSse(await call(`sessions/${solveSession.id}/messages/stream`, "POST", followUp));
  expect(explained.at(-1)!.data.message.requestContext).toEqual({ mode: "ask", followUpStep: 1 });
  expect(transport.calls.at(-1)?.input).toMatchObject({ followUpStep: 1, previousSolve: { steps: [{ number: 1 }] } });
  expect((await call(`sessions/${solveSession.id}/messages/stream`, "POST", { ...followUp, followUpStep: null })).status).toBe(409);
  const feynman = await data("practice-attempts", practiceAttemptSchema, "POST", { kind: "feynman", studySetId: set.id, learnerText: "Với P(B) > 0, P(A|B) = P(A ∩ B) / P(B).", referenceSnapshots: references, idempotencyKey: crypto.randomUUID() });
  // Saved references must survive subsequent edits; the real provider validates old source revisions.
  await data(`sources/${source.id}`, sourceSchema, "PATCH", { expectedRevision: source.revision, content: "Nội dung thay đổi sau khi lưu lượt tập." });
  const evaluation = await data(`practice-attempts/${feynman.id}/evaluate`, practiceEvaluationSchema, "POST");
  expect(evaluation.result).toMatchObject({ kind: "feynman", sufficientEvidence: true });
  const blurting = await data("practice-attempts", practiceAttemptSchema, "POST", { kind: "blurting", studySetId: set.id, learnerText: "P(A|B) = P(A ∩ B) / P(B).", referenceSnapshots: references, idempotencyKey: crypto.randomUUID() });
  const recall = await data(`practice-attempts/${blurting.id}/evaluate`, practiceEvaluationSchema, "POST");
  expect(recall.result).toMatchObject({ kind: "blurting", sufficientEvidence: true, missing: [{ learnerQuote: null }] });
  const targeted = await data("sessions", sessionSchema, "POST", { studySetId: set.id, title: "Củng cố điều kiện mẫu số", mode: "ask" });
  expect((await readSse(await call(`sessions/${targeted.id}/messages/stream`, "POST", { content: "Vì sao P(B) > 0?", mode: "ask", requestId: crypto.randomUUID(), followUpStep: null }))).at(-1)?.event).toBe("done");
  const reopened = await data(`practice-attempts/${feynman.id}`, practiceDetailSchema);
  expect(reopened.evaluation?.id).toBe(evaluation.id); expect(reopened.attempt.referenceSnapshots).toEqual(references);
  expect((await data("progress", z.array(topicProgressSchema)))[0].assessmentObservations).toHaveLength(2);
  const owner = state.userId;
  state.userId = await createUser(database.pg);
  expect((await call(`sessions/${session.id}`)).status).toBe(404);
  expect((await call(`practice-attempts/${feynman.id}`)).status).toBe(404);
  expect(await data("progress", z.array(topicProgressSchema))).toEqual([]);
  state.userId = null;
  expect((await call("study-sets")).status).toBe(401);
  state.userId = owner;
  expect((await call("study-sets", "POST", { subject: "X", title: "X", description: "", userId: owner })).status).toBe(400);
});

it("runs the production HttpAdapter through every handler namespace and persisted retries", async () => {
  state.userId = await createUser(database.pg);
  const client = new HttpAdapter("/api/v1");
  const profile = await client.getProfile();
  expect((await client.updateProfile({ timezone: "Asia/Ho_Chi_Minh", displayName: "Người học" })).id).toBe(profile.id);
  const set = await client.createStudySet({ subject: "Xác suất", title: "Bộ học HTTP", description: "" });
  const updatedSet = await client.updateStudySet(set.id, { title: "Bộ học đã sửa", expectedRevision: set.revision });
  expect((await client.listStudySets()).some(s => s.id === set.id)).toBe(true);
  const source = await client.createSource(set.id, { title: "Tài liệu", content: "Với P(B) > 0, P(A|B) = P(A ∩ B) / P(B)." });
  expect((await client.listSources(set.id))[0].id).toBe(source.id);
  const session = await client.createSession({ studySetId: set.id, title: "Phiên HTTP", mode: "solve" });
  const renamed = await client.updateSession(session.id, { title: "Đã đổi tên" });
  expect((await client.getSession(session.id)).title).toBe(renamed.title);
  expect((await client.listSessions({ studySetId: set.id })).some(s => s.id === session.id)).toBe(true);
  async function chat(payload: ChatRequest) {
    const events = []; for await (const event of client.streamChat(session.id, payload)) events.push(event);
    return events;
  }
  const original: ChatRequest = { content: "Giải bài xác suất.", mode: "solve", followUpStep: null, requestId: crypto.randomUUID() };
  const solved = await chat(original);
  expect(solved.at(-1)?.event).toBe("done");
  const followUp: ChatRequest = { content: "Giải thích bước 1.", mode: "ask", followUpStep: 1, requestId: crypto.randomUUID() };
  const explained = await chat(followUp);
  const calls = transport.calls.length;
  expect(await chat(followUp)).toEqual([explained[0], explained.at(-1)]);
  expect(transport.calls).toHaveLength(calls);
  expect((await client.listMessages(session.id)).find(m => m.requestId === followUp.requestId)?.requestContext).toEqual({ mode: "ask", followUpStep: 1 });
  await expect(chat({ ...followUp, mode: "socratic" })).rejects.toMatchObject({ code: "CONFLICT" });
  const finish = { idempotencyKey: crypto.randomUUID() };
  const extraction = await client.finishSession(session.id, finish);
  expect(await client.finishSession(session.id, finish)).toEqual(extraction);
  expect((await client.getSession(session.id)).status).toBe("ended");
  const concept = await client.updateConcept(extraction.concepts[0].id, { status: "approved", expectedRevision: extraction.concepts[0].revision });
  expect((await client.listConcepts({ studySetId: set.id, status: "approved" }))[0].id).toBe(concept.id);
  const generation = { conceptId: concept.id, expectedConceptRevision: concept.revision, idempotencyKey: crypto.randomUUID() };
  const card = await client.generateCard(generation);
  expect((await client.generateCard(generation)).id).toBe(card.id);
  const editedCard = await client.updateCard(card.id, { front: card.front, back: card.back, expectedRevision: card.revision });
  expect((await client.listCards({ studySetId: set.id }))[0].revision).toBe(editedCard.revision);
  const presentation = (await client.getDueQueue({ studySetId: set.id }))[0];
  const grade = { presentationId: presentation.presentationId, expectedRevision: presentation.expectedRevision, rating: "good" as const, idempotencyKey: crypto.randomUUID() };
  const graded = await client.gradeCard(card.id, grade);
  expect(await client.gradeCard(card.id, grade)).toEqual(graded);
  await expect(client.gradeCard(card.id, { ...grade, rating: "again" })).rejects.toMatchObject({ code: "CONFLICT" });
  const refs = [{ conceptId: concept.id, revision: concept.revision }];
  for (const kind of ["feynman", "blurting"] as const) {
    const create = { studySetId: set.id, kind, learnerText: "Với P(B) > 0, P(A|B) = P(A ∩ B) / P(B).", referenceSnapshots: refs, idempotencyKey: crypto.randomUUID() };
    const attempt = await client.createAttempt(create);
    expect((await client.createAttempt(create)).id).toBe(attempt.id);
    const evaluation = await client.evaluateAttempt(attempt.id);
    expect((await client.evaluateAttempt(attempt.id)).id).toBe(evaluation.id);
    const rewrite = { learnerText: create.learnerText + " Điều kiện P(B)>0.", idempotencyKey: crypto.randomUUID() };
    const child = await client.retryAttempt(attempt.id, rewrite);
    expect((await client.retryAttempt(attempt.id, rewrite)).id).toBe(child.id);
    expect(child).toMatchObject({ retryOfId: attempt.id, referenceSnapshots: refs });
    expect((await client.getAttempt(attempt.id)).evaluation?.id).toBe(evaluation.id);
  }
  expect(await client.listAttempts({ studySetId: set.id })).toHaveLength(4);
  const topic = (await client.getProgress()).find(p => p.studySetId === set.id)!;
  expect(topic).toMatchObject({ status: "growing", reviewCount: 1 });
  expect(topic.assessmentObservations.map(o => o.kind).sort()).toEqual(["blurting", "feynman"]);
  expect((await client.search("Đã đổi tên")).sessions.some(s => s.id === session.id)).toBe(true);
  const manual = await client.createConcept({ studySetId: set.id, title: "Thủ công", body: "Nguồn tự ghi", sourceRefs: [] });
  await client.deleteConcept(manual.id);
  await client.updateSource(source.id, { expectedRevision: source.revision, title: "Tài liệu đã sửa" });
  await client.deleteSource(source.id); await client.deleteCard(card.id); await client.deleteSession(session.id);
  expect(await client.getDueQueue({ studySetId: set.id })).toEqual([]);
  const archived = (await client.getProgress()).find(p => p.studySetId === set.id)!;
  expect(archived.totalCardCount).toBe(0); expect(archived.assessmentObservations).toHaveLength(2);
  await client.deleteStudySet(updatedSet.id);
  expect(await client.listStudySets()).toEqual([]);
  state.userId = null;
  await expect(client.getProfile()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
});

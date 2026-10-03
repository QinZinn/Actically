import { afterEach, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToString } from "react-dom/server";
import MockAdapter from "@/lib/client/mockAdapter";
import FlashcardView from "@/features/review/Flashcard";
import MessageBubble from "@/features/session/MessageBubble";
import ConceptPicker from "@/features/practice/ConceptPicker";
import { flashcards, concepts, messages } from "@/lib/client/fixtures";
import { allPages } from "@/lib/client/pagination";
import { endOfLocalDay, presentationIdOf } from "@/lib/review-logic";
afterEach(() => { vi.useRealTimers(); });
it("preserves the demo source→chat→pending→approval→single card→grade→progress loop", async () => {
  const client = new MockAdapter();
  const set = await client.createStudySet({ subject: "Sinh học", title: "Tế bào", description: "" });
  const source = await client.createSource(set.id, { title: "Tế bào", content: "Tế bào là đơn vị cơ bản của sự sống." });
  const session = await client.createSession({ studySetId: set.id, title: "Ôn tế bào", mode: "socratic" });
  const request = { requestId: crypto.randomUUID(), mode: "socratic" as const, followUpStep: null, content: "Giải thích tế bào" };
  const first = []; for await (const e of client.streamChat(session.id, request)) first.push(e);
  const replay = []; for await (const e of client.streamChat(session.id, request)) replay.push(e);
  expect(replay).toHaveLength(2); expect((await client.listMessages(session.id))).toHaveLength(2);
  expect(first[0]).toEqual(replay[0]);
  const extraction = await client.finishSession(session.id, { idempotencyKey: "finish" });
  const candidate = extraction.concepts[0];
  expect(candidate).toMatchObject({ status: "pending", studySetId: set.id, sourceRefs: [{ sourceId: source.id, revision: 1 }] });
  await expect(client.generateCard({ conceptId: candidate.id, expectedConceptRevision: 1, idempotencyKey: "early" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  const approved = await client.updateConcept(candidate.id, { expectedRevision: 1, status: "approved" });
  const cardInput = { conceptId: approved.id, expectedConceptRevision: approved.revision, idempotencyKey: "card" };
  const card = await client.generateCard(cardInput);
  expect((await client.generateCard(cardInput)).id).toBe(card.id);
  const regenerated = await client.generateCard({ ...cardInput, idempotencyKey: "regenerate" });
  expect(regenerated.id).toBe(card.id);
  expect(await client.listCards({ studySetId: set.id })).toHaveLength(1);
  const presentation = (await client.getDueQueue({ studySetId: set.id }))[0];
  const grade = { presentationId: presentation.presentationId, expectedRevision: presentation.expectedRevision, rating: "good" as const, idempotencyKey: "grade" };
  const graded = await client.gradeCard(card.id, grade);
  expect(await client.gradeCard(card.id, grade)).toEqual(graded);
  await expect(client.gradeCard(card.id, { ...grade, rating: "easy" })).rejects.toMatchObject({ code: "CONFLICT" });
  await expect(client.gradeCard(card.id, { ...grade, idempotencyKey: "different" })).rejects.toMatchObject({ code: "CONFLICT" });
  const progress = (await client.getProgress()).find(p => p.studySetId === set.id)!;
  expect(progress).toMatchObject({ status: "growing", reviewCount: 1, eligibleCardCount: 1, totalCardCount: 1 });
  const practice = await client.createAttempt({ studySetId: set.id, kind: "blurting", learnerText: "Tế bào là đơn vị cơ bản.", referenceSnapshots: [{ conceptId: approved.id, revision: approved.revision }], idempotencyKey: "practice" });
  const evaluation = await client.evaluateAttempt(practice.id);
  expect((await client.evaluateAttempt(practice.id)).id).toBe(evaluation.id);
  const rewritten = await client.retryAttempt(practice.id, { learnerText: "Tế bào là đơn vị cơ bản của sự sống.", idempotencyKey: "rewrite" });
  expect(rewritten).toMatchObject({ retryOfId: practice.id, referenceSnapshots: practice.referenceSnapshots });
  expect((await client.getAttempt(practice.id)).evaluation?.id).toBe(evaluation.id);
  await client.deleteCard(card.id);
  expect(await client.getDueQueue({ studySetId: set.id })).toEqual([]);
  expect((await client.getProgress()).find(p => p.studySetId === set.id)).toMatchObject({ status: "nodata", totalCardCount: 0, assessmentObservations: [{ attemptId: practice.id }] });
});
it("collects beyond the first page using valid limits", async () => {
  const items = Array.from({ length: 251 }, (_, id) => id);
  const page = vi.fn(async ({ limit, offset }) => items.slice(offset, offset + limit));
  expect(await allPages(page)).toEqual(items);
  expect(page.mock.calls.map(([q]) => q)).toEqual([{ limit: 100, offset: 0 }, { limit: 100, offset: 100 }, { limit: 100, offset: 200 }]);
});
it("computes profile-local day boundaries, including DST and fractional offsets", () => {
  const date = new Date("2026-10-03T18:00:00Z");
  expect(endOfLocalDay(date, "UTC").toISOString()).toBe("2026-10-04T00:00:00.000Z");
  expect(endOfLocalDay(date, "Asia/Ho_Chi_Minh").toISOString()).toBe("2026-10-04T17:00:00.000Z");
  expect(endOfLocalDay(new Date("2026-03-08T12:00:00Z"), "America/New_York").toISOString()).toBe("2026-03-09T04:00:00.000Z");
  expect(endOfLocalDay(date, "Asia/Kolkata").toISOString()).toBe("2026-10-03T18:30:00.000Z");
});
it("keeps flashcard answer hidden before reveal and labels cancelled/legacy retry honestly", () => {
  const card = { ...flashcards[0], back: "UNIQUE_ANSWER_MARKER", sourceRefs: [] };
  expect(renderToString(React.createElement(FlashcardView, { card, revealed: false, onReveal: vi.fn() }))).not.toContain(card.back);
  expect(renderToString(React.createElement(FlashcardView, { card, revealed: true, onReveal: vi.fn() }))).toContain(card.back);
  const cancelled = { ...messages.find(m => m.role === "assistant")!, status: "cancelled" as const, solve: null, requestContext: { mode: "ask" as const, followUpStep: 1 } };
  const html = renderToString(React.createElement(MessageBubble, { message: cancelled, onRetry: vi.fn() }));
  expect(html).toContain("Đã hủy"); expect(html).toContain("Thử lại"); expect(html).not.toContain(">OK<");
  expect(renderToString(React.createElement(MessageBubble, { message: { ...cancelled, requestContext: null }, onRetry: vi.fn() }))).toContain("Gửi mới");
});
it("renders recall choices with titles only and keyboard-native pressed buttons", () => {
  const concept = { ...concepts[0], status: "approved" as const, body: "HIDDEN_REFERENCE_MARKER" };
  const html = renderToString(React.createElement(ConceptPicker, { concepts: [concept], selectedIds: [concept.id], onToggle: vi.fn(), studySetIdFilter: concept.studySetId, hideBody: true }));
  expect(html).toContain(concept.title); expect(html).not.toContain(concept.body); expect(html).toContain('aria-pressed="true"');
  expect(presentationIdOf("card", 3)).toBe("card.3");
});


it("recomputes due queues on timezone changes and excludes a next-local-day card", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-03T16:59:30Z"));
  const client = new MockAdapter();
  const set = await client.createStudySet({ subject: "Toán", title: "Múi giờ", description: "" });
  const candidate = await client.createConcept({ studySetId: set.id, title: "Mẫu", body: "Một khái niệm", sourceRefs: [] });
  const concept = await client.updateConcept(candidate.id, { expectedRevision: 1, status: "approved" });
  const card = await client.generateCard({ conceptId: concept.id, expectedConceptRevision: concept.revision, idempotencyKey: "tz-card" });
  const presentation = (await client.getDueQueue({ studySetId: set.id }))[0];
  await client.gradeCard(card.id, { presentationId: presentation.presentationId, expectedRevision: presentation.expectedRevision, rating: "again", idempotencyKey: "tz-grade" });
  await client.updateProfile({ timezone: "Asia/Ho_Chi_Minh" });
  expect(await client.getDueQueue({ studySetId: set.id })).toEqual([]);
  await client.updateProfile({ timezone: "UTC" });
  expect(await client.getDueQueue({ studySetId: set.id })).toHaveLength(1);
});


it("links immutable evidence to the consumed concept parameter and shows source revisions", async () => {
  const { default: EvidenceQuote } = await import("@/features/practice/EvidenceQuote");
  const html = renderToString(React.createElement(EvidenceQuote, { conceptId: "concept/a", revision: 7, excerpt: "Khái niệm cũ",
    sourceRefs: [{ sourceId: "source", revision: 3, excerpt: "BẰNG CHỨNG LỊCH SỬ" }] }));
  expect(html).toContain("/knowledge?id=concept%2Fa");
  const text = html.replace(/<!--.*?-->/g, "");
  expect(text).toContain("r7"); expect(text).toContain("r3"); expect(text).toContain("BẰNG CHỨNG LỊCH SỬ");
});
it("blocks extraction without a set, reports duplicates and detaches removed sets in demo", async () => {
  const client = new MockAdapter();
  const standalone = await client.createSession({ studySetId: null, title: "Không chọn bộ", mode: "ask" });
  await expect(client.finishSession(standalone.id, { idempotencyKey: "without-set" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  expect((await client.getSession(standalone.id)).status).toBe("active");
  const set = await client.createStudySet({ subject: "Sinh", title: "Sinh học", description: "" });
  await client.createSource(set.id, { title: "Tế bào", content: "Tế bào là đơn vị sự sống." });
  const existing = await client.createConcept({ studySetId: set.id, title: "  TẾ BÀO  ", body: "Bản trước", sourceRefs: [] });
  const session = await client.createSession({ studySetId: set.id, title: "Ôn", mode: "ask" });
  for await (const e of client.streamChat(session.id, { content: "Học tế bào", mode: "ask", followUpStep: null, requestId: "demo-duplicates" })) expect(e.event).toBeTruthy();
  expect((await client.finishSession(session.id, { idempotencyKey: "duplicates" })).duplicateWarnings).toContainEqual({ title: "Tế bào", existingConceptId: existing.id });
  await client.deleteStudySet(set.id);
  expect((await client.getSession(session.id)).studySetId).toBeNull();
});
it("offers step follow-up only on the latest completed Solve and disables actions during mutations", async () => {
  const { default: MessageList } = await import("@/features/session/MessageList");
  const fixture = messages.find(m => m.solve)!;
  const first = { ...fixture, id: "old-solve", status: "completed" as const };
  const latest = { ...fixture, id: "new-solve", status: "completed" as const };
  const html = renderToString(React.createElement(MessageList, { messages: [first, latest], onFollowUpSolveStep: vi.fn() }));
  expect((html.match(/Xin giải thích rõ hơn/g) ?? []).length).toBe(latest.solve!.steps.length);
  const disabled = renderToString(React.createElement(MessageList, { messages: [latest], actionsDisabled: true, onFollowUpSolveStep: vi.fn() }));
  expect(disabled).not.toContain("Xin giải thích rõ hơn");
});

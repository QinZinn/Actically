import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import type { Db } from "@/db/client";
import { toApiError } from "@/server/services/errors";
import * as K from "@/server/services/knowledge";
import * as S from "@/server/services/sessions";
import * as P from "@/server/services/practice";
import * as R from "@/server/services/review";
import { getProgress, search } from "@/server/services/progress";
import { ctxFor, createUser, fakeFlashcard, key, seedApprovedConcept, setupDb } from "./helpers";

const nf = (p: Promise<unknown>) => expect(p).rejects.toMatchObject({ code: "NOT_FOUND" });
const list = { limit: 50, offset: 0 };

describe("two-user isolation (PGlite, real migrations)", () => {
  let pg: PGlite, db: Db, a: Awaited<ReturnType<typeof seedApprovedConcept>>, bob: string, alice: string;
  let session: { id: string }, attempt: { id: string }, card: { id: string; revision: number };

  beforeAll(async () => {
    ({ pg, db } = await setupDb());
    alice = await createUser(pg); bob = await createUser(pg);
    const ctx = ctxFor(db, alice, fakeFlashcard(""));
    a = await seedApprovedConcept(ctx);
    session = await S.createSession(ctx, { studySetId: a.set.id, title: "Phiên của Alice", mode: "ask" });
    attempt = await P.createAttempt(ctx, { kind: "feynman", studySetId: a.set.id, learnerText: "P(A|B) là ...", referenceSnapshots: [{ conceptId: a.concept.id, revision: a.concept.revision }], idempotencyKey: key() });
    card = await R.generateCard(ctxFor(db, alice, fakeFlashcard(a.src.id)), { conceptId: a.concept.id, expectedConceptRevision: a.concept.revision, idempotencyKey: key() });
  }, 60_000);

  it("returns 404 for every cross-user read/write, including nested IDs", async () => {
    const b = ctxFor(db, bob, fakeFlashcard(a.src.id));
    const own = await K.createStudySet(b, { subject: "B", title: "Của Bob", description: "" });
    await nf(K.updateStudySet(b, a.set.id, { title: "x", expectedRevision: 1 }));
    await nf(K.deleteStudySet(b, a.set.id));
    await nf(K.listSources(b, a.set.id));
    await nf(K.createSource(b, a.set.id, { title: "x", content: "y" }));
    await nf(K.updateSource(b, a.src.id, { content: "hijack", expectedRevision: 1 }));
    await nf(K.deleteSource(b, a.src.id));
    await nf(K.createConcept(b, { studySetId: a.set.id, title: "x", body: "y", sourceRefs: [] }));
    await expect(K.createConcept(b, { studySetId: own.id, title: "x", body: "y", sourceRefs: [{ sourceId: a.src.id, revision: 1, excerpt: "P(A|B)" }] }))
      .rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await nf(K.updateConcept(b, a.concept.id, { status: "rejected", expectedRevision: a.concept.revision }));
    await nf(K.deleteConcept(b, a.concept.id));
    await nf(S.getSession(b, session.id));
    await nf(S.updateSession(b, session.id, { title: "x" }));
    await nf(S.deleteSession(b, session.id));
    await nf(S.listMessages(b, session.id));
    await nf(S.streamChat(b, session.id, { content: "hi", mode: "ask", requestId: key(), followUpStep: null }));
    await nf(S.finishSession(b, session.id, { idempotencyKey: key() }));
    await nf(S.createSession(b, { studySetId: a.set.id, title: "x", mode: "ask" }));
    await nf(S.updateSession(b, (await S.createSession(b, { studySetId: null, title: "x", mode: "ask" })).id, { studySetId: a.set.id }));
    await nf(P.createAttempt(b, { kind: "blurting", studySetId: own.id, learnerText: "x", referenceSnapshots: [{ conceptId: a.concept.id, revision: a.concept.revision }], idempotencyKey: key() }));
    await nf(P.getAttempt(b, attempt.id));
    await nf(P.evaluateAttempt(b, attempt.id));
    await nf(P.retryAttempt(b, attempt.id, { learnerText: "x", idempotencyKey: key() }));
    await nf(R.generateCard(b, { conceptId: a.concept.id, expectedConceptRevision: a.concept.revision, idempotencyKey: key() }));
    await nf(R.updateCard(b, card.id, { front: "x", back: "y", expectedRevision: card.revision }));
    await nf(R.deleteCard(b, card.id));
    await nf(R.gradeCard(b, card.id, { presentationId: R.presentationIdOf(card.id, card.revision), idempotencyKey: key(), expectedRevision: card.revision, rating: "good" }));
  }, 60_000);

  it("lists, due queue, progress and search never include the other user's rows", async () => {
    const b = ctxFor(db, bob);
    expect((await K.listStudySets(b)).map(s => s.id)).not.toContain(a.set.id);
    expect(await K.listConcepts(b, { ...list, studySetId: a.set.id })).toEqual([]);
    expect(await S.listSessions(b, list)).not.toContainEqual(expect.objectContaining({ id: session.id }));
    expect(await P.listAttempts(b, list)).toEqual([]);
    expect(await R.listCards(b, list)).toEqual([]);
    expect(await R.dueQueue(b, list)).toEqual([]);
    expect((await getProgress(b)).map(p => p.studySetId)).not.toContain(a.set.id);
    expect(await search(b, "Xác suất")).toEqual({ sessions: [], concepts: [] });
    expect((await search(ctxFor(db, alice), "xác suất")).concepts.map(c => c.id)).toContain(a.concept.id);
  }, 60_000);

  it("maps malformed ids to 404 rather than 500", async () => {
    const err = await S.getSession(ctxFor(db, bob), "not-a-uuid").catch(e => e);
    expect(toApiError(err, "r").status).toBe(404);
  }, 60_000);

  it("composite foreign keys reject cross-user links even through a privileged connection", async () => {
    await expect(pg.query("insert into concepts (user_id, study_set_id, title, body, normalized_title) values ($1, $2, 't', 'b', 't')", [bob, a.set.id]))
      .rejects.toMatchObject({ code: "23503" });
    await expect(pg.query("insert into review_events (user_id, card_id, presentation_id, idempotency_key, rating, reviewed_at, revision_before, revision_after, state_before, state_after) values ($1, $2, 'p', 'k', 'good', now(), 1, 2, '{}', '{}')", [bob, card.id]))
      .rejects.toMatchObject({ code: "23503" });
  }, 60_000);

  it("RLS: authenticated clients read only their own rows and cannot write", async () => {
    const asUser = async (uid: string, q: string) => {
      await pg.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
      try { return await pg.query<{ n: number }>(q); } finally { await pg.exec("reset role;"); }
    };
    expect((await asUser(bob, "select count(*)::int as n from concepts")).rows[0].n).toBe(0);
    expect((await asUser(alice, "select count(*)::int as n from concepts")).rows[0].n).toBe(1);
    expect((await asUser(bob, "select count(*)::int as n from ai_reservations")).rows[0].n).toBe(0);
    await expect(asUser(alice, `update flashcards set revision = 99 where id = '${card.id}' returning id`)).resolves.toMatchObject({ rows: [] });
    await expect(asUser(alice, `insert into study_sets (user_id, subject, title) values ('${alice}', 's', 't')`)).rejects.toThrow(/row-level security/);
  }, 60_000);
});

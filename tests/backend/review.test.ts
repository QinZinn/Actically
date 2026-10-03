import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import type { AiLearningService } from "@/contracts/ai";
import type { Db } from "@/db/client";
import * as K from "@/server/services/knowledge";
import * as P from "@/server/services/practice";
import * as R from "@/server/services/review";
import { updateProfile } from "@/server/services/profile";
import { ctxFor, createUser, fakeFlashcard, key, seedApprovedConcept, setupDb } from "./helpers";

const list = { limit: 50, offset: 0 };

describe("approval gating and generated-card uniqueness", () => {
  let pg: PGlite, db: Db, user: string;
  beforeAll(async () => { ({ pg, db } = await setupDb()); user = await createUser(pg); }, 60_000);

  it("refuses cards and practice for pending/rejected concepts", async () => {
    const { set, src } = await seedApprovedConcept(ctxFor(db, user));
    const ctx = ctxFor(db, user, fakeFlashcard(src.id));
    const pending = await K.createConcept(ctx, { studySetId: set.id, title: "Độc lập", body: "P(A∩B) = P(A)P(B)", sourceRefs: [] });
    await expect(R.generateCard(ctx, { conceptId: pending.id, expectedConceptRevision: 1, idempotencyKey: key() })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(P.createAttempt(ctx, { kind: "feynman", studySetId: set.id, learnerText: "x", referenceSnapshots: [{ conceptId: pending.id, revision: 1 }], idempotencyKey: key() }))
      .rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const rejected = await K.updateConcept(ctx, pending.id, { status: "rejected", expectedRevision: 1 });
    await expect(R.generateCard(ctx, { conceptId: rejected.id, expectedConceptRevision: rejected.revision, idempotencyKey: key() })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(await R.listCards(ctx, { ...list, studySetId: set.id })).toEqual([]);
  });

  it("one card per concept: key replay, regeneration in place, concurrent generation, stale revision", async () => {
    const { concept, src, set } = await seedApprovedConcept(ctxFor(db, user));
    let calls = 0;
    const ai: Partial<AiLearningService> = { generateFlashcard: async input => { calls++; return { ...(await fakeFlashcard(src.id).generateFlashcard!(input)), front: `Mặt trước ${calls}` }; } };
    const ctx = ctxFor(db, user, ai);
    const k1 = key();
    const first = await R.generateCard(ctx, { conceptId: concept.id, expectedConceptRevision: concept.revision, idempotencyKey: k1 });
    expect(await R.generateCard(ctx, { conceptId: concept.id, expectedConceptRevision: concept.revision, idempotencyKey: k1 })).toEqual(first);
    expect(calls).toBe(1);
    const regenerated = await R.generateCard(ctx, { conceptId: concept.id, expectedConceptRevision: concept.revision, idempotencyKey: key() });
    expect(regenerated).toMatchObject({ id: first.id, revision: first.revision + 1, front: "Mặt trước 2" });
    const raced = await Promise.allSettled([1, 2, 3].map(() => R.generateCard(ctx, { conceptId: concept.id, expectedConceptRevision: concept.revision, idempotencyKey: key() })));
    // per-user AI cap (2 in flight) rejects the third; the others upsert the same single card
    expect(raced.filter(r => r.status === "rejected").map(r => (r as PromiseRejectedResult).reason.code)).toEqual(["RATE_LIMITED"]);
    expect(await R.listCards(ctx, { ...list, studySetId: set.id })).toHaveLength(1);
    await expect(R.generateCard(ctx, { conceptId: concept.id, expectedConceptRevision: concept.revision + 5, idempotencyKey: key() })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(R.generateCard(ctx, { conceptId: set.id, expectedConceptRevision: 1, idempotencyKey: k1 })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("AI not configured: no card is created and the error is explicit", async () => {
    const { concept, set } = await seedApprovedConcept(ctxFor(db, user));
    const ctx = ctxFor(db, user);
    await expect(R.generateCard(ctx, { conceptId: concept.id, expectedConceptRevision: concept.revision, idempotencyKey: key() })).rejects.toMatchObject({ code: "AI_NOT_CONFIGURED" });
    expect(await R.listCards(ctx, { ...list, studySetId: set.id })).toEqual([]);
  });
});

describe("FSRS grading: atomic, idempotent, concurrency-safe", () => {
  let pg: PGlite, db: Db, user: string;
  const count = async (cardId: string) => (await pg.query<{ n: number }>("select count(*)::int as n from review_events where card_id = $1", [cardId])).rows[0].n;
  const freshCard = async () => {
    const { concept, src } = await seedApprovedConcept(ctxFor(db, user));
    const ctx = ctxFor(db, user, fakeFlashcard(src.id));
    await R.generateCard(ctx, { conceptId: concept.id, expectedConceptRevision: concept.revision, idempotencyKey: key() });
    const [p] = (await R.dueQueue(ctx, { ...list, studySetId: concept.studySetId }));
    return { ctx, p };
  };
  beforeAll(async () => { ({ pg, db } = await setupDb()); user = await createUser(pg); }, 60_000);

  it("persists scheduler state + append-only event; replays by key; rejects reused presentations", async () => {
    const { ctx, p } = await freshCard();
    expect(p).toMatchObject({ presentationId: R.presentationIdOf(p.card.id, 1), expectedRevision: 1 });
    const k = key();
    const grade = { presentationId: p.presentationId, idempotencyKey: k, expectedRevision: p.expectedRevision, rating: "good" as const };
    const result = await R.gradeCard(ctx, p.card.id, grade);
    expect(result.revision).toBe(2);
    expect(await R.gradeCard(ctx, p.card.id, grade)).toEqual(result);
    expect(await count(p.card.id)).toBe(1);
    const [stored] = await R.listCards(ctx, { ...list, studySetId: p.card.studySetId });
    expect(stored.scheduler).toMatchObject({ reps: 1, due: result.dueAt });
    expect(stored.scheduler.last_review).not.toBeNull();
    await expect(R.gradeCard(ctx, p.card.id, { ...grade, idempotencyKey: key() })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(R.gradeCard(ctx, p.card.id, { ...grade, rating: "again" })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(R.gradeCard(ctx, p.card.id, { ...grade, idempotencyKey: key(), presentationId: R.presentationIdOf(p.card.id, 2) })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await count(p.card.id)).toBe(1);
  });

  it("two tabs grading the same presentation concurrently: exactly one wins", async () => {
    const { ctx, p } = await freshCard();
    const results = await Promise.allSettled(["good", "again", "easy"].map(rating =>
      R.gradeCard(ctx, p.card.id, { presentationId: p.presentationId, idempotencyKey: key(), expectedRevision: 1, rating: rating as "good" })));
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(r => r.status === "rejected").map(r => (r as PromiseRejectedResult).reason.code)).toEqual(["CONFLICT", "CONFLICT"]);
    expect(await count(p.card.id)).toBe(1);
  });

  it("editing a card invalidates its open presentation", async () => {
    const { ctx, p } = await freshCard();
    await R.updateCard(ctx, p.card.id, { front: "Sửa", back: "Sửa", expectedRevision: 1 });
    await expect(R.gradeCard(ctx, p.card.id, { presentationId: p.presentationId, idempotencyKey: key(), expectedRevision: 1, rating: "good" })).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("time boundaries (UTC storage, user-timezone days)", () => {
  it("computes the end of the local day, DST-safe", () => {
    const now = new Date("2026-10-03T16:30:00Z"); // 23:30 in Ho Chi Minh City
    expect(R.endOfLocalDay(now, "Asia/Ho_Chi_Minh").toISOString()).toBe("2026-10-03T17:00:00.000Z");
    expect(R.endOfLocalDay(now, "UTC").toISOString()).toBe("2026-10-04T00:00:00.000Z");
    expect(R.endOfLocalDay(new Date("2026-03-08T12:00:00Z"), "America/New_York").toISOString()).toBe("2026-03-09T04:00:00.000Z");
    expect(R.endOfLocalDay(new Date("2026-11-01T12:00:00Z"), "America/New_York").toISOString()).toBe("2026-11-02T05:00:00.000Z");
  });

  it("due queue follows the profile timezone", { timeout: 60_000 }, async () => {
    const { pg, db } = await setupDb();
    const user = await createUser(pg);
    const now = new Date("2026-10-03T16:30:00Z");
    const ctx = ctxFor(db, user, {}, () => now);
    const { concept, src } = await seedApprovedConcept(ctx);
    const card = await R.generateCard(ctxFor(db, user, fakeFlashcard(src.id), () => now), { conceptId: concept.id, expectedConceptRevision: concept.revision, idempotencyKey: key() });
    await pg.query("update flashcards set due = $1 where id = $2", ["2026-10-03T17:30:00Z", card.id]); // 00:30 tomorrow in HCMC
    expect(await R.dueQueue(ctx, list)).toEqual([]); // default profile timezone Asia/Ho_Chi_Minh
    await updateProfile(ctx, { timezone: "UTC" });
    expect((await R.dueQueue(ctx, list)).map(p => p.card.id)).toEqual([card.id]);
  });
});

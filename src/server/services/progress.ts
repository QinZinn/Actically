import { and, desc, eq, exists, ilike, or } from "drizzle-orm";
import type { TopicProgress } from "@/contracts/dto";
import type { GradeRequest } from "@/contracts/requests";
import { concepts, flashcards, learningSessions, messages, practiceAttempts, practiceEvaluations, reviewEvents, studySets } from "@/db/schema";
import { iso, type Ctx } from "./context";
import { toConcept } from "./knowledge";
import { toSession } from "./sessions";

type ProgressStatus = TopicProgress["status"];
type ReviewRating = GradeRequest["rating"];

export const POLICY_VERSION = "reviews-v1" as const;
const WINDOW = 5;

/**
 * reviews-v1 (product heuristic, not certification) for one card, given its ratings newest-first:
 * weak = ≥2 Again in the last five; solid = exactly five reviews, ≥4 Good/Easy and no Again; growing = any other evidence.
 */
export function cardStatus(ratings: ReviewRating[]): ProgressStatus {
  const last = ratings.slice(0, WINDOW);
  if (!last.length) return "nodata";
  const again = last.filter(r => r === "again").length, strong = last.filter(r => r === "good" || r === "easy").length;
  if (again >= 2) return "weak";
  if (last.length === WINDOW && strong >= 4 && again === 0) return "solid";
  return "growing";
}

/** Topic: weak if any eligible card weak; solid only with ≥3 active cards all solid; growing if any evidence; else nodata. */
export function topicStatus(cards: ProgressStatus[]): ProgressStatus {
  if (cards.includes("weak")) return "weak";
  if (cards.length >= 3 && cards.every(s => s === "solid")) return "solid";
  return cards.some(s => s !== "nodata") ? "growing" : "nodata";
}

export async function getProgress(ctx: Ctx): Promise<TopicProgress[]> {
  const mine = ctx.userId;
  const [sets, cards, events, evaluations] = await Promise.all([
    ctx.db.select().from(studySets).where(eq(studySets.userId, mine)).orderBy(desc(studySets.updatedAt)),
    ctx.db.select({ id: flashcards.id, studySetId: flashcards.studySetId }).from(flashcards).where(eq(flashcards.userId, mine)),
    // ponytail: loads every review event of the user; switch to row_number() over (partition by card_id) when histories get large.
    ctx.db.select().from(reviewEvents).where(eq(reviewEvents.userId, mine)).orderBy(desc(reviewEvents.reviewedAt)),
    ctx.db.select({ attemptId: practiceAttempts.id, studySetId: practiceAttempts.studySetId, kind: practiceAttempts.kind, result: practiceEvaluations.result, createdAt: practiceEvaluations.createdAt })
      .from(practiceEvaluations).innerJoin(practiceAttempts, and(eq(practiceAttempts.id, practiceEvaluations.attemptId), eq(practiceAttempts.userId, mine)))
      .where(eq(practiceEvaluations.userId, mine)).orderBy(desc(practiceEvaluations.createdAt)),
  ]);
  return sets.map(set => {
    const setCards = cards.filter(c => c.studySetId === set.id);
    const windows = setCards.map(c => events.filter(e => e.cardId === c.id).slice(0, WINDOW));
    const statuses = windows.map(w => cardStatus(w.map(e => e.rating)));
    const evidence = windows.flat().sort((a, b) => b.reviewedAt.getTime() - a.reviewedAt.getTime());
    const observations = evaluations.filter(e => e.studySetId === set.id).slice(0, 10);
    const latest = Math.max(evidence[0]?.reviewedAt.getTime() ?? 0, observations[0]?.createdAt.getTime() ?? 0);
    return {
      studySetId: set.id, title: set.title, status: topicStatus(statuses), policyVersion: POLICY_VERSION,
      eligibleCardCount: statuses.filter(s => s !== "nodata").length, totalCardCount: setCards.length, reviewCount: evidence.length,
      latestAssessmentAt: latest ? iso(new Date(latest)) : null,
      reviewEvidence: evidence.map(e => ({ id: e.id, cardId: e.cardId, presentationId: e.presentationId, rating: e.rating, reviewedAt: iso(e.reviewedAt), revisionBefore: e.revisionBefore, revisionAfter: e.revisionAfter })),
      // AI observations stay separate and are never folded into the status above.
      assessmentObservations: observations.map(o => ({ attemptId: o.attemptId, kind: o.kind, summary: o.result.summary, sufficientEvidence: o.result.sufficientEvidence, createdAt: iso(o.createdAt) })),
    };
  });
}

const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, c => `\\${c}`)}%`;

/** User-scoped search over session titles, message content and concepts. */
export async function search(ctx: Ctx, q: string) {
  const p = likePattern(q);
  const inMessages = exists(ctx.db.select({ id: messages.id }).from(messages)
    .where(and(eq(messages.sessionId, learningSessions.id), eq(messages.userId, ctx.userId), ilike(messages.content, p))));
  const sessions = await ctx.db.select().from(learningSessions)
    .where(and(eq(learningSessions.userId, ctx.userId), or(ilike(learningSessions.title, p), inMessages))).orderBy(desc(learningSessions.updatedAt)).limit(20);
  const conceptRows = await ctx.db.select().from(concepts)
    .where(and(eq(concepts.userId, ctx.userId), or(ilike(concepts.title, p), ilike(concepts.body, p)))).orderBy(desc(concepts.updatedAt)).limit(20);
  return { sessions: sessions.map(toSession), concepts: conceptRows.map(toConcept) };
}

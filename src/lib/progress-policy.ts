import type { TopicProgress } from "@/contracts/dto";
import type { GradeRequest } from "@/contracts/requests";
type ProgressStatus = TopicProgress["status"];
type ReviewRating = GradeRequest["rating"];

export const POLICY_VERSION = "reviews-v1" as const;
export const WINDOW = 5;

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

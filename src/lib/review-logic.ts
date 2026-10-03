import { fsrs, Rating, type Card, type Grade } from "ts-fsrs";
import type { Flashcard } from "@/contracts/dto";
import type { GradeRequest } from "@/contracts/requests";
export const scheduler = fsrs({ enable_fuzz: false });
export const RATINGS: Record<GradeRequest["rating"], Grade> = { again: Rating.Again, hard: Rating.Hard, good: Rating.Good, easy: Rating.Easy };
export const toState = (c: Card): Flashcard["scheduler"] => ({ due: c.due.toISOString(), stability: c.stability, difficulty: c.difficulty, elapsed_days: c.elapsed_days,
  scheduled_days: c.scheduled_days, learning_steps: c.learning_steps, reps: c.reps, lapses: c.lapses, state: c.state, last_review: c.last_review ? c.last_review.toISOString() : null });
export const fromState = (s: Flashcard["scheduler"]): Card => ({ ...s, due: new Date(s.due), last_review: s.last_review ? new Date(s.last_review) : undefined });
export const presentationIdOf = (cardId: string, revision: number) => `${cardId}.${revision}`;
function zonedParts(d: Date, timeZone: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(d).map(x => [x.type, Number(x.value)]));
  return p as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>;
}
const offsetMs = (d: Date, tz: string) => { const p = zonedParts(d, tz); return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(d.getTime() / 1000) * 1000; };
/** First instant of the next local calendar day in `timeZone` (UTC Date). DST-safe via a second offset probe. */
export function endOfLocalDay(now: Date, timeZone: string) {
  const p = zonedParts(now, timeZone);
  const wall = Date.UTC(p.year, p.month - 1, p.day + 1);
  let t = wall - offsetMs(new Date(wall), timeZone);
  t = wall - offsetMs(new Date(t), timeZone);
  return new Date(t);
}

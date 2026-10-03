import { and, count, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { aiReservations } from "@/db/schema";
import { nowOf, type Ctx } from "./context";
import { ApiFailure } from "./errors";

// Policy from docs/AI-INTEGRATION.md: 20 AI operations per rolling 10 minutes, at most 2 in flight per user.
export const AI_WINDOW_MS = 10 * 60_000, AI_WINDOW_MAX = 20, AI_IN_FLIGHT_MAX = 2;
const STALE_MS = 2 * 60_000; // operations time out at 60 s; an unreleased slot older than this is a crashed request

/** Persistently reserve a per-user AI slot. Returns a release function (call in finally). */
export async function reserveAi(ctx: Ctx, operation: string): Promise<() => Promise<void>> {
  const now = nowOf(ctx);
  const id = await ctx.db.transaction(async tx => {
    // Serialise reservations of one user so two concurrent requests cannot both see a free slot.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"ai:" + ctx.userId}))`);
    const mine = eq(aiReservations.userId, ctx.userId);
    await tx.delete(aiReservations).where(and(mine, lt(aiReservations.createdAt, new Date(now.getTime() - AI_WINDOW_MS)))); // prune: older than window and long expired
    const [{ inWindow }] = await tx.select({ inWindow: count() }).from(aiReservations).where(and(mine, gt(aiReservations.createdAt, new Date(now.getTime() - AI_WINDOW_MS))));
    const [{ inFlight }] = await tx.select({ inFlight: count() }).from(aiReservations).where(and(mine, isNull(aiReservations.releasedAt), gt(aiReservations.expiresAt, now)));
    if (inWindow >= AI_WINDOW_MAX || inFlight >= AI_IN_FLIGHT_MAX) throw new ApiFailure("RATE_LIMITED", "Bạn đang gửi quá nhiều yêu cầu AI, vui lòng thử lại sau ít phút.");
    const [row] = await tx.insert(aiReservations).values({ userId: ctx.userId, operation, createdAt: now, expiresAt: new Date(now.getTime() + STALE_MS) }).returning({ id: aiReservations.id });
    return row.id;
  });
  return async () => {
    await ctx.db.update(aiReservations).set({ releasedAt: new Date() }).where(and(eq(aiReservations.id, id), eq(aiReservations.userId, ctx.userId)));
  };
}

export async function withAi<T>(ctx: Ctx, operation: string, fn: () => Promise<T>): Promise<T> {
  const release = await reserveAi(ctx, operation);
  try { return await fn(); } finally { await release(); }
}

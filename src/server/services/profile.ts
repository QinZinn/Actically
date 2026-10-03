import { eq } from "drizzle-orm";
import type { UserProfile } from "@/contracts/dto";
import type { ProfileUpdate } from "@/contracts/requests";
import type { Db } from "@/db/client";
import { profiles } from "@/db/schema";
import { getAiMetadata } from "@/server/composition";
import { iso, nowOf, type Ctx } from "./context";

export const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";

/** Profile row is created lazily on first authenticated access. */
export async function ensureProfile(db: Db, userId: string) {
  await db.insert(profiles).values({ id: userId }).onConflictDoNothing();
  const [row] = await db.select().from(profiles).where(eq(profiles.id, userId));
  return row;
}

const toProfile = (ctx: Ctx, r: typeof profiles.$inferSelect): UserProfile => ({
  id: r.id, email: ctx.email, displayName: r.displayName, timezone: r.timezone, sidebarCollapsed: r.sidebarCollapsed,
  connections: { database: "connected", ai: getAiMetadata().configured ? "configured" : "unavailable" },
  createdAt: iso(r.createdAt), updatedAt: iso(r.updatedAt),
});

export async function getProfile(ctx: Ctx) {
  return toProfile(ctx, await ensureProfile(ctx.db, ctx.userId));
}

export async function updateProfile(ctx: Ctx, patch: ProfileUpdate) {
  await ensureProfile(ctx.db, ctx.userId);
  const [row] = await ctx.db.update(profiles).set({ ...patch, updatedAt: nowOf(ctx) }).where(eq(profiles.id, ctx.userId)).returning();
  return toProfile(ctx, row);
}

export async function userTimezone(db: Db, userId: string) {
  const [row] = await db.select({ timezone: profiles.timezone }).from(profiles).where(eq(profiles.id, userId));
  return row?.timezone ?? DEFAULT_TIMEZONE;
}

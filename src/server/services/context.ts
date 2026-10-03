import type { AiLearningService } from "@/contracts/ai";
import type { Db } from "@/db/client";
import { conflict } from "./errors";

/** Everything a service needs. userId always comes from the verified session (route.ts) or a test fixture. */
export type Ctx = { db: Db; userId: string; email: string | null; ai: AiLearningService; requestId: string; now?: () => Date; signal?: AbortSignal };

export const nowOf = (ctx: Ctx) => (ctx.now ? ctx.now() : new Date());
export const iso = (d: Date) => d.toISOString();

/** Same idempotency key must carry the same payload, otherwise 409. */
export function assertSamePayload(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw conflict("Khóa idempotency đã được dùng cho yêu cầu khác.");
}

export const normalizeTitle = (s: string) => s.normalize("NFC").toLocaleLowerCase("vi").replace(/\s+/g, " ").trim();

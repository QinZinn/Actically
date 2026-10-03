import "server-only";
import { z } from "zod";
import { conceptStatusSchema, idSchema } from "@/contracts/dto";
import { getDb } from "@/db/client";
import { getAiLearningService } from "@/server/composition";
import type { Ctx } from "@/server/services/context";
import { ApiFailure, toApiError } from "@/server/services/errors";
import { requireUser } from "./session";

const MAX_BODY = 128 * 1024;

type RouteArgs<P> = { req: Request; params: P };
/** Wraps a route handler: verified user, per-request ctx, `{ data }` envelope and typed error body. */
export function route<P = Record<string, string>>(fn: (ctx: Ctx, args: RouteArgs<P>) => Promise<unknown>) {
  return async (req: Request, context: { params: Promise<P> }) => {
    const requestId = crypto.randomUUID();
    try {
      const user = await requireUser();
      const ctx: Ctx = { db: getDb(), userId: user.id, email: user.email, ai: getAiLearningService(), requestId, signal: req.signal };
      const data = await fn(ctx, { req, params: await context.params });
      if (data instanceof Response) return data;
      return Response.json({ data: data ?? null }, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
      return errorResponse(e, requestId);
    }
  };
}

export function errorResponse(e: unknown, requestId: string) {
  const { status, body } = toApiError(e, requestId);
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Reads at most MAX_BODY bytes; chunked/lying bodies are cut off without buffering the rest. */
async function readLimited(req: Request): Promise<string> {
  const tooLarge = () => new ApiFailure("VALIDATION_ERROR", "Yêu cầu quá lớn.");
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) throw tooLarge();
  if (!req.body) return "";
  const reader = req.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) { await reader.cancel().catch(() => {}); throw tooLarge(); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  chunks.reduce((offset, c) => (bytes.set(c, offset), offset + c.byteLength), 0);
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { throw new ApiFailure("VALIDATION_ERROR", "JSON không hợp lệ."); }
}

export async function readBody<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  const text = await readLimited(req);
  let json: unknown;
  try { json = text ? JSON.parse(text) : {}; } catch { throw new ApiFailure("VALIDATION_ERROR", "JSON không hợp lệ."); }
  return schema.parse(json);
}

const listQuerySchema = z.strictObject({
  studySetId: idSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(10000).default(0),
  status: conceptStatusSchema.optional(),
});
export type ListParams = z.infer<typeof listQuerySchema>;
export const readListQuery = (req: Request): ListParams => listQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
const searchQuerySchema = z.strictObject({ q: z.string().trim().min(1).max(200) });
export const readSearchQuery = (req: Request) => searchQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams)).q;
export const readEmptyBody = (req: Request) => readBody(req, z.strictObject({}));

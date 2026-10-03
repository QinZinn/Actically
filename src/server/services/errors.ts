import { ZodError } from "zod";
import type { ErrorCode } from "@/contracts/dto";
import { AiServiceError } from "@/server/ai/errors";

const STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, VALIDATION_ERROR: 400, CONFLICT: 409, RATE_LIMITED: 429,
  AI_NOT_CONFIGURED: 503, AI_MODEL_UNAVAILABLE: 503, SERVICE_UNAVAILABLE: 503, AI_PROVIDER_ERROR: 502, AI_INVALID_OUTPUT: 502,
  AI_TIMEOUT: 504, AI_CANCELLED: 499, INTERNAL_ERROR: 500,
};
const RETRYABLE = new Set<ErrorCode>(["RATE_LIMITED", "SERVICE_UNAVAILABLE", "AI_PROVIDER_ERROR", "AI_TIMEOUT", "AI_INVALID_OUTPUT", "AI_CANCELLED", "INTERNAL_ERROR"]);

export class ApiFailure extends Error {
  constructor(public readonly code: ErrorCode, message: string, public readonly retryable = RETRYABLE.has(code)) { super(message); this.name = "ApiFailure"; }
}

export const notFound = () => new ApiFailure("NOT_FOUND", "Không tìm thấy dữ liệu.");
export const conflict = (message = "Dữ liệu đã thay đổi, vui lòng tải lại.") => new ApiFailure("CONFLICT", message);

/** Normalises any thrown value into the public error body. Never echoes DB/provider internals or learner text. */
export function toApiError(e: unknown, requestId: string) {
  let failure: ApiFailure;
  if (e instanceof ApiFailure) failure = e;
  else if (e instanceof AiServiceError) failure = new ApiFailure(e.code, e.message, e.retryable);
  else if (e instanceof ZodError) failure = new ApiFailure("VALIDATION_ERROR", "Dữ liệu gửi lên không hợp lệ.");
  else if (isUniqueViolation(e)) failure = conflict("Yêu cầu trùng lặp hoặc xung đột dữ liệu.");
  else if (isForeignKeyViolation(e) || pgCode(e) === "22P02") failure = notFound(); // 22P02: malformed uuid id
  else {
    console.error(`[api] ${requestId} unexpected ${e instanceof Error ? e.name : typeof e}`);
    failure = new ApiFailure("INTERNAL_ERROR", "Lỗi máy chủ.");
  }
  return { status: STATUS[failure.code], body: { error: { code: failure.code, message: failure.message, requestId, retryable: failure.retryable } } };
}

const pgCode = (e: unknown): string | undefined => {
  for (let cur = e as { code?: unknown; cause?: unknown } | undefined, i = 0; cur && i < 4; cur = cur.cause as typeof cur, i++)
    if (typeof cur.code === "string") return cur.code;
};
export const isUniqueViolation = (e: unknown) => pgCode(e) === "23505";
const isForeignKeyViolation = (e: unknown) => pgCode(e) === "23503";

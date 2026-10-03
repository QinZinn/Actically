import type { ErrorCode } from "@/contracts/dto";
export class AiServiceError extends Error {
  constructor(public readonly code: ErrorCode, message: string, public readonly retryable = false) { super(message); this.name = "AiServiceError"; }
}

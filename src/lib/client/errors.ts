import type { ErrorCode, ApiError } from "@/contracts/dto";

export class ActicallyClientError extends Error {
  code: ErrorCode;
  requestId: string;
  retryable: boolean;

  constructor({
    code,
    message,
    requestId,
    retryable,
  }: {
    code: ErrorCode;
    message: string;
    requestId: string;
    retryable: boolean;
  }) {
    super(message);
    this.name = "ActicallyClientError";
    this.code = code;
    this.requestId = requestId;
    this.retryable = retryable;
  }
}

export function fromApiError(apiError: ApiError["error"]): ActicallyClientError {
  return new ActicallyClientError({
    code: apiError.code,
    message: apiError.message,
    requestId: apiError.requestId,
    retryable: apiError.retryable,
  });
}

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_ERROR"
  | "RATE_LIMITED"
  | "HTTP_ERROR"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "MALFORMED_RESPONSE"
  | "CARRIER_ERROR";

export type AppError = Error & {
  code: ErrorCode;
  status?: number;
  details?: Record<string, unknown>;
  cause?: unknown;
};

const createAppError = (
  message: string,
  code: ErrorCode,
  options?: { status?: number; details?: Record<string, unknown>; cause?: unknown }
): AppError => {
  const error = new Error(message) as AppError;
  error.name = code;
  error.code = code;
  error.status = options?.status;
  error.details = options?.details;
  error.cause = options?.cause;
  return error;
};

export const createValidationError = (message: string, details?: Record<string, unknown>): AppError =>
  createAppError(message, "VALIDATION_ERROR", { details });

export const createAuthError = (
  message: string,
  options?: { status?: number; details?: Record<string, unknown>; cause?: unknown }
): AppError => createAppError(message, "AUTH_ERROR", options);

export const createRateLimitError = (
  message: string,
  options?: { status?: number; details?: Record<string, unknown>; cause?: unknown }
): AppError => createAppError(message, "RATE_LIMITED", options);

export const createHttpError = (
  message: string,
  options?: { status?: number; details?: Record<string, unknown>; cause?: unknown }
): AppError => createAppError(message, "HTTP_ERROR", options);

export const createTimeoutError = (
  message: string,
  options?: { details?: Record<string, unknown>; cause?: unknown }
): AppError => createAppError(message, "TIMEOUT", options);

export const createNetworkError = (
  message: string,
  options?: { details?: Record<string, unknown>; cause?: unknown }
): AppError => createAppError(message, "NETWORK_ERROR", options);

export const createMalformedResponseError = (
  message: string,
  options?: { details?: Record<string, unknown>; cause?: unknown }
): AppError => createAppError(message, "MALFORMED_RESPONSE", options);

export const createCarrierError = (
  message: string,
  options?: { status?: number; details?: Record<string, unknown>; cause?: unknown }
): AppError => createAppError(message, "CARRIER_ERROR", options);

export const isAppError = (error: unknown): error is AppError => {
  return typeof error === "object" && error !== null && "code" in error;
};

export const hasErrorCode = (error: unknown, code: ErrorCode): error is AppError => {
  return isAppError(error) && error.code === code;
};

export const isValidationError = (error: unknown): error is AppError => hasErrorCode(error, "VALIDATION_ERROR");
export const isAuthError = (error: unknown): error is AppError => hasErrorCode(error, "AUTH_ERROR");
export const isRateLimitError = (error: unknown): error is AppError => hasErrorCode(error, "RATE_LIMITED");
export const isHttpError = (error: unknown): error is AppError => hasErrorCode(error, "HTTP_ERROR");
export const isTimeoutError = (error: unknown): error is AppError => hasErrorCode(error, "TIMEOUT");
export const isNetworkError = (error: unknown): error is AppError => hasErrorCode(error, "NETWORK_ERROR");
export const isMalformedResponseError = (error: unknown): error is AppError =>
  hasErrorCode(error, "MALFORMED_RESPONSE");
export const isCarrierError = (error: unknown): error is AppError => hasErrorCode(error, "CARRIER_ERROR");

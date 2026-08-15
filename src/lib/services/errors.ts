/**
 * Typed application errors thrown by the service layer (lib/services).
 *
 * The server actions catch them to render a friendly form message; the REST
 * API maps them to HTTP status codes. Keeping one error type means the forms
 * and the API can never disagree about what went wrong.
 */
export type AppErrorCode =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED";

const STATUS: Record<AppErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS[code];
  }
}

/** Convenience constructors so call sites read clearly. */
export const validationError = (message: string) => new AppError("VALIDATION", message);
export const unauthenticatedError = (message = "Not signed in.") =>
  new AppError("UNAUTHENTICATED", message);
export const forbiddenError = (message = "You do not have permission to perform this action.") =>
  new AppError("FORBIDDEN", message);
export const notFoundError = (message = "Not found.") => new AppError("NOT_FOUND", message);
export const conflictError = (message: string) => new AppError("CONFLICT", message);
export const rateLimitedError = (message: string) => new AppError("RATE_LIMITED", message);

/** Human-friendly message for form rendering (mirrors the old action helpers). */
export function errorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) {
    // Never surface framework control-flow digests (redirect / notFound).
    const msg = error.message || "";
    if (
      msg.includes("NEXT_REDIRECT") ||
      msg.includes("NEXT_NOT_FOUND") ||
      (error as { digest?: string }).digest?.startsWith("NEXT_")
    ) {
      return "Something went wrong. Try again.";
    }
    return msg || "Something went wrong. Try again.";
  }
  return "Something went wrong. Try again.";
}

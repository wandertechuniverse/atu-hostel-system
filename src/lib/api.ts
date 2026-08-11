import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { AppError } from "@/lib/services/errors";

/**
 * REST API helpers. Success responses use a `{ data }` envelope; failures use
 * `{ error: { code, message } }`. Documented in docs/11-api.md.
 */

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      throw new AppError("VALIDATION", "Request body must be a JSON object.");
    }
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("VALIDATION", "Request body must be valid JSON.");
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

/** Map any thrown error to a JSON error response. Unknown errors never leak. */
export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  // eslint-disable-next-line no-console
  console.error("[api] unhandled error:", error);
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "Internal server error." } },
    { status: 500 },
  );
}

/** Best-effort client IP for rate limiting / audit, matching the login action. */
export async function clientIp() {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "local"
  );
}

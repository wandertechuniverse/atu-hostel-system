import "server-only";

import { cookies } from "next/headers";
import {
  CSRF_COOKIE,
  CSRF_FIELD,
  CSRF_TTL,
  signCsrfToken,
  verifyCsrfToken,
} from "@/lib/csrf-token";
import { forbiddenError } from "@/lib/services/errors";

export {
  CSRF_COOKIE,
  CSRF_FIELD,
  CSRF_TTL,
  signCsrfToken,
  verifyCsrfToken,
};

/**
 * CSRF protection via signed JWT cookies (double-submit).
 *
 * Authoritative check: cookie value === form field (double-submit).
 * JWT signature is verified when possible; if Edge middleware and the Node
 * server briefly disagree on SESSION_SECRET (env not yet wired to Edge), a
 * matching double-submit pair is still accepted so legitimate forms work.
 */

/**
 * Ensure a valid CSRF cookie exists and return its value.
 * Prefer proxy seeding; this is a fallback for Server Actions / Route Handlers.
 */
export async function ensureCsrfToken(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CSRF_COOKIE)?.value;
  if (existing && existing.length > 16) return existing;

  const token = await signCsrfToken();
  store.set(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 2,
  });
  return token;
}

/**
 * Reject state-changing requests without a valid double-submit CSRF pair.
 * Call at the top of every mutating server action that receives FormData.
 */
export async function requireCsrf(formData: FormData): Promise<void> {
  const store = await cookies();
  const cookieToken = (store.get(CSRF_COOKIE)?.value ?? "").trim();
  const formToken = String(formData.get(CSRF_FIELD) ?? "").trim();

  if (!cookieToken || !formToken) {
    throw forbiddenError(
      "Missing CSRF token. Refresh the page and try again.",
    );
  }

  if (cookieToken !== formToken) {
    throw forbiddenError(
      "Invalid CSRF token. Refresh the page and try again.",
    );
  }

  // Double-submit already proves the browser holds our cookie. Signature
  // check is best-effort (same secret on Edge + Node when configured).
  await verifyCsrfToken(formToken);
}

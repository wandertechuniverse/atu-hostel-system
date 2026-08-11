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
 * Why JWT instead of an in-memory store:
 * - Survives multi-instance / serverless deploys (no shared Map)
 * - Self-contained: signature + expiry live in the token
 * - Cookie + form field must match so a cross-site form cannot forge both
 *
 * Cookie is readable by the browser (not httpOnly) so client forms can
 * double-submit the same value. Signature still prevents tampering.
 */

/**
 * Ensure a valid CSRF cookie exists and return its value.
 * Prefer proxy seeding; this is a fallback for Server Actions.
 */
export async function ensureCsrfToken(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CSRF_COOKIE)?.value;
  if (existing && (await verifyCsrfToken(existing))) return existing;

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
  const cookieToken = store.get(CSRF_COOKIE)?.value ?? "";
  const formToken = String(formData.get(CSRF_FIELD) ?? "");

  if (!cookieToken || !formToken || cookieToken !== formToken) {
    throw forbiddenError("Invalid or missing CSRF token.");
  }
  if (!(await verifyCsrfToken(formToken))) {
    throw forbiddenError("Invalid or missing CSRF token.");
  }
}

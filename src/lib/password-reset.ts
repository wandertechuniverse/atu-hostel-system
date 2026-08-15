import { createHash, randomBytes } from "node:crypto";

/**
 * Password-reset token helpers - pure functions, importable in unit tests
 * without a database (same split as lib/scoping.ts and lib/export-format.ts).
 *
 * Security model (SECURITY.md §3): the token is 256 bits of randomness, and
 * only its SHA-256 hash is stored - a database leak never yields a usable
 * token. Tokens are single-use and short-lived.
 */

/** How long a reset token stays valid. */
export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

/** Generate a fresh opaque token (32 random bytes, hex-encoded). */
export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

/** One-way hash for storage / lookup. Never store the raw token. */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isTokenExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

/** The link emailed to the user (and shown in dev mode). */
export function buildResetUrl(origin: string, token: string): string {
  return `${origin}/reset-password?token=${token}`;
}

/**
 * Origin for reset emails. Production always uses NEXT_PUBLIC_SITE_URL so a
 * spoofed Host header cannot rewrite the link. Development may fall back to
 * the incoming request origin.
 */
export function resetLinkOrigin(
  requestOrigin: string,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string {
  const configured = env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (env.NODE_ENV === "production") {
    if (!configured) {
      throw new Error(
        "NEXT_PUBLIC_SITE_URL must be set in production for password-reset links.",
      );
    }
    return configured;
  }
  return configured || requestOrigin.replace(/\/$/, "");
}

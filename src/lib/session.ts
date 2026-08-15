import type { SessionOptions } from "iron-session";

export type SessionData = {
  userId?: string;
  role?: "STUDENT" | "MANAGER" | "ADMIN";
  hostelId?: string | null;
  isLoggedIn?: boolean;
};

export const SESSION_COOKIE = "hbms_session";

/** Known-weak default. Allowed in local/e2e only. Must be ≥32 chars (iron-session). */
export const DEV_SESSION_SECRET = "dev-only-secret-change-me-32chars!";

/** Production must set SESSION_SECRET to something other than the fallback. */
export function resolveSessionSecret(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string {
  const secret = env.SESSION_SECRET?.trim();
  if (env.NODE_ENV === "production") {
    if (!secret || secret === DEV_SESSION_SECRET) {
      throw new Error(
        "SESSION_SECRET must be set to a long random value in production.",
      );
    }
    return secret;
  }
  return secret || DEV_SESSION_SECRET;
}

export const sessionOptions: SessionOptions = {
  password: resolveSessionSecret(),
  cookieName: SESSION_COOKIE,
  ttl: 60 * 60 * 2, // 2 hours
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  },
};

export function isStaffRole(role: SessionData["role"]) {
  return role === "ADMIN" || role === "MANAGER";
}

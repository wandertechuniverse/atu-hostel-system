import type { SessionOptions } from "iron-session";

export type SessionData = {
  userId?: string;
  role?: "STUDENT" | "MANAGER" | "ADMIN";
  hostelId?: string | null;
  isLoggedIn?: boolean;
};

export const SESSION_COOKIE = "hbms_session";

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? "dev-only-secret-change-me",
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

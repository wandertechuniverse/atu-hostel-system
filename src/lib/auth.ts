import "server-only";

import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sessionOptions, type SessionData } from "@/lib/session";

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

/**
 * Throws a redirect to /login when there is no valid session.
 *
 * The database is the source of truth on every guarded call. A session whose
 * user was deleted or deactivated is invalid - this is also what prevents a
 * stale userId from leaking into audit writes and causing the foreign-key
 * violation. Role and hostel scope are overlaid from the user row, so
 * privilege changes apply immediately instead of waiting out the cookie TTL.
 * (The cookie itself is never mutated here: Next.js forbids cookie writes
 * during render - mutations happen in server actions only.)
 */
export async function requireSession(): Promise<SessionData> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, isActive: true, role: true, hostelId: true },
  });
  if (!user || !user.isActive) redirect("/login");

  return { ...session, role: user.role, hostelId: user.hostelId };
}

/** Requires the session to carry one of the given roles. Fails closed otherwise. */
export async function requireRole(
  ...roles: SessionData["role"][]
): Promise<SessionData> {
  const session = await requireSession();
  if (!session.role || !roles.includes(session.role)) redirect("/login");
  return session;
}

export async function createSession(user: {
  id: string;
  role: SessionData["role"];
  hostelId: string | null;
}) {
  const session = await getSession();
  session.userId = user.id;
  session.role = user.role;
  session.hostelId = user.hostelId;
  session.isLoggedIn = true;
  await session.save();
}

export async function destroySession() {
  const session = await getSession();
  session.destroy();
}

/** Where each role lands after login. */
export function homeForRole(role: SessionData["role"]) {
  return role === "STUDENT" ? "/" : "/admin";
}

export async function verifyCredentials(email: string, password: string) {
  // Normalize so "Admin@ATU.edu.gh " still matches the seeded account.
  const normalized = email.trim().toLowerCase();
  const user =
    (await db.user.findUnique({ where: { email: normalized } })) ??
    // Fallback for older rows stored with mixed case before normalization.
    (await db.user.findFirst({
      where: { email: { equals: normalized } },
    }));
  if (!user) return null;
  if (!user.isActive) return null;
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return null;
  return user;
}

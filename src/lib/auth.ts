import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { formatDbError, withDbRetry } from "@/lib/db-errors";
import { sessionOptions, type SessionData } from "@/lib/session";

/** Request-scoped: layout, sidebar and page all call this; one iron-session read. */
export const getSession = cache(async () => {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
});

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
 *
 * Wrapped in React `cache` so StaffShell + page share one user lookup per request.
 * Transient Neon failures are retried once; persistent DB errors fail closed to
 * /login instead of a Prisma stack in the error boundary.
 */
export const requireSession = cache(async (): Promise<SessionData> => {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) redirect("/login");

  // Corrupted cookies must not hit Prisma (can surface as opaque KnownRequestError).
  const userId = session.userId;
  if (typeof userId !== "string" || userId.length < 8) {
    redirect("/login");
  }

  type SessionUser = {
    id: string;
    isActive: boolean;
    role: NonNullable<SessionData["role"]>;
    hostelId: string | null;
  };

  let user: SessionUser | null = null;

  try {
    // No multi-second retry loop here: ETIMEDOUT retried once already made
    // markAllReadAction take ~22s. One attempt; on any DB failure → login.
    user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true, role: true, hostelId: true },
    });
  } catch (error) {
    // Never leak PrismaClientKnownRequestError / ETIMEDOUT into the RSC error UI.
    console.error("[auth] requireSession DB failure:", formatDbError(error));
    redirect("/login?error=db");
  }

  if (!user || !user.isActive) redirect("/login");

  return { ...session, role: user.role, hostelId: user.hostelId };
});

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
  // iron-session: destroy() only takes effect once the cookie is rewritten.
  await session.save();
}

export { homeForRole } from "@/lib/paths";

export async function verifyCredentials(email: string, password: string) {
  // Normalize so "Admin@ATU.edu.gh " still matches the seeded account.
  // One lookup only - emails are stored lowercased at write time.
  const normalized = email.trim().toLowerCase();
  const user = await withDbRetry("verifyCredentials.findUnique", () =>
    db.user.findUnique({ where: { email: normalized } }),
  );
  if (!user || !user.isActive) return null;
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return null;
  return user;
}

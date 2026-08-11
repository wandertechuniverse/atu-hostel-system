import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { SessionData } from "@/lib/session";
import { unauthenticatedError, forbiddenError } from "@/lib/services/errors";

/**
 * API version of requireSession(): validates the session against the database
 * (deleted/deactivated users are rejected) and overlays the fresh role and
 * hostel scope - but throws a 401 AppError instead of redirecting to /login,
 * which is what the server components / server actions do.
 */
export async function requireApiSession(): Promise<SessionData> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) throw unauthenticatedError();

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, isActive: true, role: true, hostelId: true },
  });
  if (!user || !user.isActive) throw unauthenticatedError();

  return { ...session, role: user.role, hostelId: user.hostelId };
}

export async function requireApiRole(
  ...roles: SessionData["role"][]
): Promise<SessionData> {
  const session = await requireApiSession();
  if (!session.role || !roles.includes(session.role)) throw forbiddenError();
  return session;
}

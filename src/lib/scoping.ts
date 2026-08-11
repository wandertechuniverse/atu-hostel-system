import type { SessionData } from "@/lib/session";

/**
 * Row-level security for HBMS (docs/04-roles-and-scoping.md).
 *
 * The rule: a Hostel Manager is an Administrator scoped to ONE hostel.
 * Every staff query must carry the hostel filter at the source (Prisma `where`),
 * and every mutating action must re-check role AND ownership before touching the
 * database. All helpers fail closed: a manager whose `hostelId` is null is denied,
 * never granted everything.
 */

/** Sentinel that can never match a real record id, so fail-closed filters return nothing. */
const NONE = "__none__";

export function isManager(session: SessionData) {
  return session.role === "MANAGER";
}

export function isStaff(session: SessionData) {
  return session.role === "ADMIN" || session.role === "MANAGER";
}

/** Hostel-scoped `where` for staff queries. Admins see all; managers only their own hostel. */
export function hostelScopeWhere(session: SessionData) {
  return isManager(session) ? { id: session.hostelId ?? NONE } : {};
}

/** Booking-scoped `where` for staff queries. */
export function bookingScopeWhere(session: SessionData) {
  return isManager(session) ? { room: { hostelId: session.hostelId ?? NONE } } : {};
}

/** Payment-scoped `where` for staff queries. */
export function paymentScopeWhere(session: SessionData) {
  return isManager(session)
    ? { booking: { room: { hostelId: session.hostelId ?? NONE } } }
    : {};
}

/**
 * Per-record authorization for staff: may this session manage the given hostel?
 * Admins manage every hostel; managers only their own (fails closed on null).
 */
export function canManageHostel(session: SessionData, hostelId: string) {
  if (session.role === "ADMIN") return true;
  return session.role === "MANAGER" && session.hostelId === hostelId;
}

/** Thrown by server actions when a record is out of scope. Maps to a 403-style message. */
export class ForbiddenError extends Error {
  constructor() {
    super("You do not have permission to perform this action.");
    this.name = "ForbiddenError";
  }
}

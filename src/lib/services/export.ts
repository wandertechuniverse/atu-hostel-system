import "server-only";

import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import {
  EXPORT_FORMAT,
  EXPORT_VERSION,
  redactUser,
  type DatabaseExport,
} from "@/lib/export-format";

export { EXPORT_FORMAT, EXPORT_VERSION, redactUser };
export type { DatabaseExport };

/**
 * Database export / backup. Dumps every table as structured JSON with the
 * metadata needed to restore or audit it. Password hashes are NEVER included
 * - an export is a data snapshot for analysis or backup, not a credential
 * store (SECURITY.md: credentials stay server-side).
 *
 * The shape is versioned so a future restore/import can detect older files:
 *   { format: "hbms-backup", version: 1, exportedAt, exporterId, counts, ... }
 */

/**
 * Admin-only (callers must have run requireRole/requireApiRole("ADMIN")).
 * Reads every table in parallel and returns a JSON-safe snapshot.
 * Dates serialize via JSON.stringify into ISO strings.
 */
export async function exportDatabase(
  exporterId: string | null,
): Promise<DatabaseExport> {
  const [users, hostels, rooms, bookings, payments, activityLog, notifications] =
    await Promise.all([
      db.user.findMany({ orderBy: { createdAt: "asc" } }),
      db.hostel.findMany({ orderBy: { createdAt: "asc" } }),
      db.room.findMany({ orderBy: { createdAt: "asc" } }),
      db.booking.findMany({ orderBy: { createdAt: "asc" } }),
      db.payment.findMany({ orderBy: { createdAt: "asc" } }),
      db.activityLog.findMany({ orderBy: { createdAt: "asc" } }),
      db.notification.findMany({ orderBy: { createdAt: "asc" } }),
    ]);

  const sanitizedUsers = users.map((u) => redactUser({ ...u }));

  const payload: DatabaseExport = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    exporterId,
    counts: {
      users: sanitizedUsers.length,
      hostels: hostels.length,
      rooms: rooms.length,
      bookings: bookings.length,
      payments: payments.length,
      activityLog: activityLog.length,
      notifications: notifications.length,
    },
    users: sanitizedUsers,
    hostels: hostels.map((h) => ({ ...h })),
    rooms: rooms.map((r) => ({ ...r })),
    bookings: bookings.map((b) => ({ ...b })),
    payments: payments.map((p) => ({ ...p })),
    activityLog: activityLog.map((l) => ({ ...l })),
    notifications: notifications.map((n) => ({ ...n })),
  };

  // The export itself is a security-relevant event (SECURITY.md §6).
  await audit({
    action: "database.exported",
    userId: exporterId,
    subjectType: "Database",
  });

  return payload;
}

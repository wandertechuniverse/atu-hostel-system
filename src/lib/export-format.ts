/**
 * Database export format - pure helpers, importable in unit tests without a
 * database (same split as lib/scoping.ts). The DB-touching export service in
 * lib/services/export.ts re-exports these.
 */

export const EXPORT_FORMAT = "hbms-backup";
export const EXPORT_VERSION = 2;

/** Pure helper (unit-testable without a DB): drop credential fields. */
export function redactUser(user: Record<string, unknown>) {
  const { password: _password, ...rest } = user;
  return rest;
}

export type DatabaseExport = {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  exporterId: string | null;
  counts: {
    users: number;
    hostels: number;
    rooms: number;
    bookings: number;
    payments: number;
    activityLog: number;
    notifications: number;
  };
  users: Record<string, unknown>[];
  hostels: Record<string, unknown>[];
  rooms: Record<string, unknown>[];
  bookings: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  activityLog: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
};

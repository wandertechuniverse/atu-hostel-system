import "server-only";

import { headers } from "next/headers";
import { db } from "@/lib/db";

/** Best-effort request IP; never throws, so a missing request scope can't drop a log row. */
async function requestIp() {
  try {
    const h = await headers();
    return (
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "local"
    );
  } catch {
    return null;
  }
}

/**
 * Audit trail (ActivityLog): records that an action occurred and by whom.
 * Append-only - the application exposes no delete path (SECURITY.md §6).
 * Kept separate from lib/scoping.ts so the pure RLS helpers stay importable
 * in unit tests without a database.
 */
export async function audit(opts: {
  action: string;
  userId?: string | null;
  subjectType?: string | null;
  subjectId?: string | null;
  ipAddress?: string | null;
}) {
  // Every entry records where it happened when the caller doesn't supply one.
  const ip = opts.ipAddress ?? (await requestIp());
  try {
    await db.activityLog.create({
      data: {
        action: opts.action,
        userId: opts.userId ?? null,
        subjectType: opts.subjectType ?? null,
        subjectId: opts.subjectId ?? null,
        ipAddress: ip,
      },
    });
  } catch (error) {
    // Logging must never take down the business operation it records. If the
    // actor id is stale (e.g. the user was deleted), record the event without
    // an actor rather than failing the action.
    if (opts.userId) {
      try {
        await db.activityLog.create({
          data: {
            action: opts.action,
            userId: null,
            subjectType: opts.subjectType ?? null,
            subjectId: opts.subjectId ?? null,
            ipAddress: ip,
          },
        });
        return;
      } catch {
        // Fall through to the console report below.
      }
    }
    console.error(`[audit] failed to write activity log for "${opts.action}":`, error);
  }
}

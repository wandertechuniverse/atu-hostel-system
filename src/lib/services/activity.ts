import { db } from "@/lib/db";
import type { SessionData } from "@/lib/session";
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZES,
  type ActivityFilters,
} from "@/lib/activity-query";
import type { ActivityLogWhereInput } from "@/generated/prisma/models/ActivityLog";

export type { ActivityFilters };
export { DEFAULT_PAGE_SIZE, PAGE_SIZES, parseActivityQuery } from "@/lib/activity-query";

function buildWhere(query: ActivityFilters): ActivityLogWhereInput {
  const where: ActivityLogWhereInput = {};

  const action = query.action?.trim() ?? "";
  if (action) where.action = action;

  const subjectType = query.subjectType?.trim() ?? "";
  if (subjectType) where.subjectType = subjectType;

  const q = query.q?.trim() ?? "";
  if (q) {
    where.OR = [
      { action: { contains: q, mode: "insensitive" } },
      { subjectType: { contains: q, mode: "insensitive" } },
      { subjectId: { contains: q, mode: "insensitive" } },
      { ipAddress: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const from = query.from?.trim();
  const to = query.to?.trim();
  if (from || to) {
    where.createdAt = {};
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) where.createdAt.gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) {
        // Inclusive end of day
        d.setUTCHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
    }
  }

  return where;
}

/**
 * Paginated, filterable activity log (PRD A7 / FR-10). Callers guard on ADMIN.
 */
export async function listActivity(
  _session: SessionData,
  query: ActivityFilters,
) {
  const page =
    Number.isInteger(query.page) && (query.page ?? 1) > 0 ? (query.page ?? 1) : 1;
  const rawSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
  const pageSize = (PAGE_SIZES as readonly number[]).includes(rawSize)
    ? rawSize
    : DEFAULT_PAGE_SIZE;

  const where = buildWhere(query);

  const [entries, total] = await Promise.all([
    db.activityLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.activityLog.count({ where }),
  ]);

  return {
    entries,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Summary cards for the audit log header. */
export async function activityStats() {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [total, today, securityWeek, loginsWeek] = await Promise.all([
    db.activityLog.count(),
    db.activityLog.count({ where: { createdAt: { gte: startOfToday } } }),
    db.activityLog.count({
      where: {
        createdAt: { gte: weekAgo },
        OR: [
          { action: { contains: "failed", mode: "insensitive" } },
          { action: { contains: "rate_limited", mode: "insensitive" } },
        ],
      },
    }),
    db.activityLog.count({
      where: { action: "auth.login", createdAt: { gte: weekAgo } },
    }),
  ]);

  return { total, today, securityWeek, loginsWeek };
}

/** Distinct filter options for the audit UI. */
export async function activityFilterOptions() {
  const [actions, subjectTypes] = await Promise.all([
    db.activityLog.findMany({
      select: { action: true },
      distinct: ["action"],
      orderBy: { action: "asc" },
    }),
    db.activityLog.findMany({
      select: { subjectType: true },
      distinct: ["subjectType"],
      orderBy: { subjectType: "asc" },
    }),
  ]);
  return {
    actions: actions.map((a) => a.action),
    subjectTypes: subjectTypes
      .map((s) => s.subjectType)
      .filter((s): s is string => Boolean(s)),
  };
}

/** Rows for CSV export (capped). */
export async function exportActivity(
  _session: SessionData,
  query: ActivityFilters,
  limit = 5_000,
) {
  const where = buildWhere(query);
  const entries = await db.activityLog.findMany({
    where,
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 10_000),
  });

  return entries.map((e) => ({
    Time: new Date(e.createdAt).toISOString(),
    Event: e.action,
    Actor: e.user?.name ?? "system",
    Email: e.user?.email ?? "",
    SubjectType: e.subjectType ?? "",
    SubjectId: e.subjectId ?? "",
    IP: e.ipAddress ?? "",
  }));
}



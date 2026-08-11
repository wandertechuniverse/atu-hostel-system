import { db } from "@/lib/db";
import type { SessionData } from "@/lib/session";
import { validationError } from "./errors";
import type { ActivityLogWhereInput } from "@/generated/prisma/models/ActivityLog";

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZES = [10, 25, 50, 100] as const;

export type ActivityFilters = {
  action?: string;
  subjectType?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

function buildWhere(query: ActivityFilters): ActivityLogWhereInput {
  const where: ActivityLogWhereInput = {};

  const action = query.action?.trim() ?? "";
  if (action) where.action = action;

  const subjectType = query.subjectType?.trim() ?? "";
  if (subjectType) where.subjectType = subjectType;

  const q = query.q?.trim() ?? "";
  if (q) {
    where.OR = [
      { action: { contains: q } },
      { subjectType: { contains: q } },
      { subjectId: { contains: q } },
      { ipAddress: { contains: q } },
      { user: { name: { contains: q } } },
      { user: { email: { contains: q } } },
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
          { action: { contains: "failed" } },
          { action: { contains: "rate_limited" } },
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
    Time: e.createdAt.toISOString(),
    Event: e.action,
    Actor: e.user?.name ?? "system",
    Email: e.user?.email ?? "",
    SubjectType: e.subjectType ?? "",
    SubjectId: e.subjectId ?? "",
    IP: e.ipAddress ?? "",
  }));
}

export function parseActivityQuery(searchParams: URLSearchParams): ActivityFilters {
  const rawPage = Number(searchParams.get("page") ?? "1");
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const rawSize = Number(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE));
  const pageSize = (PAGE_SIZES as readonly number[]).includes(rawSize)
    ? rawSize
    : DEFAULT_PAGE_SIZE;

  const action = searchParams.get("action")?.trim() ?? "";
  if (action && !/^[a-z][a-z0-9_.-]*$/i.test(action)) {
    throw validationError("Invalid action filter.");
  }

  const subjectType = searchParams.get("subjectType")?.trim() ?? "";
  if (subjectType && !/^[A-Za-z][A-Za-z0-9_]*$/.test(subjectType)) {
    throw validationError("Invalid subject type filter.");
  }

  const q = (searchParams.get("q") ?? "").trim().slice(0, 100);
  const from = (searchParams.get("from") ?? "").trim();
  const to = (searchParams.get("to") ?? "").trim();

  if (from && Number.isNaN(Date.parse(from))) {
    throw validationError("Invalid from date.");
  }
  if (to && Number.isNaN(Date.parse(to))) {
    throw validationError("Invalid to date.");
  }

  return { action, subjectType, q, from, to, page, pageSize };
}

export { PAGE_SIZES, DEFAULT_PAGE_SIZE };

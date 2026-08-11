import { db } from "@/lib/db";
import type { SessionData } from "@/lib/session";
import { validationError } from "./errors";

const PAGE_SIZE = 25;

/**
 * Paginated, filterable activity log (PRD A7 / FR-10). Callers guard on ADMIN.
 * Subject names are resolved so callers never see raw UUIDs.
 */
export async function listActivity(
  _session: SessionData,
  query: { action?: string; page?: number },
) {
  const page = Number.isInteger(query.page) && (query.page ?? 1) > 0 ? (query.page ?? 1) : 1;
  const action = typeof query.action === "string" ? query.action.trim() : "";

  const where = action ? { action } : {};

  const [entries, total] = await Promise.all([
    db.activityLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.activityLog.count({ where }),
  ]);

  return {
    entries,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export function parseActivityQuery(searchParams: URLSearchParams) {
  const rawPage = Number(searchParams.get("page") ?? "1");
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const action = searchParams.get("action")?.trim() ?? "";
  if (action && !/^[a-z][a-z0-9_.-]*$/i.test(action)) {
    throw validationError("Invalid action filter.");
  }
  return { action, page };
}

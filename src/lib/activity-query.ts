import { validationError } from "@/lib/services/errors";

export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZES = [10, 25, 50, 100] as const;

export type ActivityFilters = {
  action?: string;
  subjectType?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

/** Pure query parser - no database (unit-testable). */
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

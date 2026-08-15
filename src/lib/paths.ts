/** Role URL prefixes. Public catalog stays at `/` and `/hostels/:id`. */

export type AppRole = "STUDENT" | "MANAGER" | "ADMIN";

export function homeForRole(role: AppRole | undefined | null): string {
  if (role === "ADMIN") return "/admin";
  if (role === "MANAGER") return "/manager";
  return "/";
}

export function staffBase(role: AppRole | undefined | null): string {
  return role === "MANAGER" ? "/manager" : "/admin";
}

export function staffPath(
  role: AppRole | undefined | null,
  suffix = "",
): string {
  const base = staffBase(role);
  if (!suffix || suffix === "/") return base;
  return `${base}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
}

export const STUDENT_BOOKINGS = "/student/bookings";
export const STUDENT_PROFILE = "/student/profile";

const SHARED_STAFF = new Set([
  "",
  "analytics",
  "hostels",
  "bookings",
  "payments",
  "reports",
]);

/** First path segment after /admin or /manager. */
export function staffSection(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  return parts[1] ?? "";
}

export function isSharedStaffSection(section: string): boolean {
  return SHARED_STAFF.has(section);
}

export function swapStaffPrefix(
  pathname: string,
  to: "/admin" | "/manager",
): string {
  if (pathname === "/admin" || pathname === "/manager") return to;
  if (pathname.startsWith("/admin/")) {
    return `${to}${pathname.slice("/admin".length)}`;
  }
  if (pathname.startsWith("/manager/")) {
    return `${to}${pathname.slice("/manager".length)}`;
  }
  return pathname;
}

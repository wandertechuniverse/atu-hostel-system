import Link from "next/link";
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

const PAGE_SIZES = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;

type ActionTone = "default" | "secondary" | "destructive" | "outline";

/** Colour-code the event family so security events stand out (SECURITY.md §6). */
function actionTone(action: string): ActionTone {
  if (action.includes("failed") || action.includes("rate_limited")) {
    return "destructive";
  }
  if (action.startsWith("auth.")) return "secondary";
  if (action.startsWith("user.")) return "secondary";
  return "default";
}

function formatTime(iso: Date) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; pageSize?: string }>;
}) {
  await requireRole("ADMIN");

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const actionFilter = sp.action?.trim() || "";
  const rawSize = Number(sp.pageSize) || DEFAULT_PAGE_SIZE;
  const pageSize = (PAGE_SIZES as readonly number[]).includes(rawSize)
    ? rawSize
    : DEFAULT_PAGE_SIZE;

  const where = actionFilter ? { action: actionFilter } : {};

  const [rows, total, actionOptions] = await Promise.all([
    db.activityLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.activityLog.count({ where }),
    db.activityLog.findMany({
      select: { action: true },
      distinct: ["action"],
      orderBy: { action: "asc" },
    }),
  ]);

  // Resolve opaque subject ids to human labels in a few batched queries.
  const subjectIds = (type: string) =>
    rows
      .filter((r) => r.subjectType === type && r.subjectId)
      .map((r) => r.subjectId as string);

  const [users, hostels, bookings, payments] = await Promise.all([
    db.user.findMany({
      where: { id: { in: subjectIds("User") } },
      select: { id: true, name: true },
    }),
    db.hostel.findMany({
      where: { id: { in: subjectIds("Hostel") } },
      select: { id: true, name: true },
    }),
    db.booking.findMany({
      where: { id: { in: subjectIds("Booking") } },
      select: {
        id: true,
        user: { select: { name: true } },
        room: {
          select: {
            roomNumber: true,
            hostel: { select: { name: true } },
          },
        },
      },
    }),
    db.payment.findMany({
      where: { id: { in: subjectIds("Payment") } },
      select: { id: true, reference: true },
    }),
  ]);

  const userName = new Map(users.map((u) => [u.id, u.name]));
  const hostelName = new Map(hostels.map((h) => [h.id, h.name]));
  const bookingLabel = new Map(
    bookings.map((b) => [
      b.id,
      `${b.user.name} · ${b.room.hostel.name} ${b.room.roomNumber}`,
    ]),
  );
  const paymentLabel = new Map(
    payments.map((p) => [p.id, p.reference]),
  );

  function subjectLabel(type: string | null, id: string | null): string {
    if (!type || !id) return "-";
    if (type === "User") return userName.get(id) ?? id.slice(0, 8);
    if (type === "Hostel") return hostelName.get(id) ?? id.slice(0, 8);
    if (type === "Booking") return bookingLabel.get(id) ?? id.slice(0, 8);
    if (type === "Payment") return paymentLabel.get(id) ?? id.slice(0, 8);
    return id.slice(0, 8);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const qs = (p: number, size = pageSize) => {
    const params = new URLSearchParams({ page: String(p), pageSize: String(size) });
    if (actionFilter) params.set("action", actionFilter);
    return `?${params}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
        <p className="text-sm text-muted-foreground">
          Read-only audit trail of significant actions (FR-10). Append-only -
          entries cannot be edited or deleted. Administrator only.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="size-4 text-muted-foreground" />
              System activity log
            </CardTitle>
            <CardDescription>
              {total.toLocaleString()} entr{total === 1 ? "y" : "ies"} · page{" "}
              {page} of {totalPages}
            </CardDescription>
          </div>
          {/* Plain GET form - filters via URL search params, no client JS. */}
          <form method="get" className="flex flex-wrap items-center gap-2">
            <label htmlFor="action" className="text-xs text-muted-foreground">
              Event
            </label>
            <select
              id="action"
              name="action"
              defaultValue={actionFilter}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <option value="">All events</option>
              {actionOptions.map((a) => (
                <option key={a.action} value={a.action}>
                  {a.action}
                </option>
              ))}
            </select>
            <label htmlFor="pageSize" className="text-xs text-muted-foreground">
              Rows
            </label>
            <select
              id="pageSize"
              name="pageSize"
              defaultValue={String(pageSize)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Apply
            </button>
            {(actionFilter || pageSize !== DEFAULT_PAGE_SIZE) && (
              <Link
                href="/admin/activity"
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Clear
              </Link>
            )}
          </form>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="text-right">IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No activity matches this filter.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatTime(log.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={actionTone(log.action)}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {log.user ? (
                      <div>
                        <div className="font-medium">{log.user.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {log.user.email}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">system</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {log.subjectType ? (
                      <div>
                        <span className="text-xs font-medium">
                          {log.subjectType}
                        </span>
                        <div className="text-xs">
                          {subjectLabel(log.subjectType, log.subjectId)}
                        </div>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {log.ipAddress ?? "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <Link
                href={qs(Math.max(1, page - 1))}
                aria-disabled={page <= 1}
                className={`inline-flex h-8 items-center gap-1 rounded-md border border-input px-3 text-sm transition-colors ${
                  page <= 1
                    ? "pointer-events-none opacity-40"
                    : "hover:bg-muted"
                }`}
              >
                <ChevronLeft className="size-4" />
                Previous
              </Link>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Link
                href={qs(Math.min(totalPages, page + 1))}
                aria-disabled={page >= totalPages}
                className={`inline-flex h-8 items-center gap-1 rounded-md border border-input px-3 text-sm transition-colors ${
                  page >= totalPages
                    ? "pointer-events-none opacity-40"
                    : "hover:bg-muted"
                }`}
              >
                Next
                <ChevronRight className="size-4" />
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ScrollText,
  ShieldAlert,
  Activity,
  LogIn,
  Database,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  activityFilterOptions,
  activityStats,
  exportActivity,
  listActivity,
  PAGE_SIZES,
  DEFAULT_PAGE_SIZE,
} from "@/lib/services/activity";
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
import { ExportCsvButton } from "@/components/admin/export-csv-button";

export const dynamic = "force-dynamic";

type ActionTone = "default" | "secondary" | "destructive" | "outline";

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
  searchParams: Promise<{
    page?: string;
    action?: string;
    pageSize?: string;
    subjectType?: string;
    q?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const session = await requireRole("ADMIN");
  const sp = await searchParams;

  const page = Math.max(1, Number(sp.page) || 1);
  const actionFilter = sp.action?.trim() || "";
  const subjectType = sp.subjectType?.trim() || "";
  const q = sp.q?.trim() || "";
  const from = sp.from?.trim() || "";
  const to = sp.to?.trim() || "";
  const rawSize = Number(sp.pageSize) || DEFAULT_PAGE_SIZE;
  const pageSize = (PAGE_SIZES as readonly number[]).includes(rawSize)
    ? rawSize
    : DEFAULT_PAGE_SIZE;

  const filters = {
    action: actionFilter,
    subjectType,
    q,
    from,
    to,
    page,
    pageSize,
  };

  const [list, stats, options, exportRows] = await Promise.all([
    listActivity(session, filters),
    activityStats(),
    activityFilterOptions(),
    exportActivity(session, { ...filters, page: 1, pageSize: 25 }, 2_000),
  ]);

  const { entries: rows, total, totalPages } = list;

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
  const paymentLabel = new Map(payments.map((p) => [p.id, p.reference]));

  function subjectLabel(type: string | null, id: string | null): string {
    if (!type || !id) return "-";
    if (type === "User") return userName.get(id) ?? id.slice(0, 8);
    if (type === "Hostel") return hostelName.get(id) ?? id.slice(0, 8);
    if (type === "Booking") return bookingLabel.get(id) ?? id.slice(0, 8);
    if (type === "Payment") return paymentLabel.get(id) ?? id.slice(0, 8);
    return id.slice(0, 8);
  }

  const qs = (p: number, size = pageSize) => {
    const params = new URLSearchParams({
      page: String(p),
      pageSize: String(size),
    });
    if (actionFilter) params.set("action", actionFilter);
    if (subjectType) params.set("subjectType", subjectType);
    if (q) params.set("q", q);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return `?${params}`;
  };

  const selectClass =
    "h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

  const summary = [
    {
      label: "Total events",
      value: stats.total.toLocaleString(),
      icon: Database,
      chip: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
    },
    {
      label: "Today",
      value: stats.today.toLocaleString(),
      icon: Activity,
      chip: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    },
    {
      label: "Logins (7d)",
      value: stats.loginsWeek.toLocaleString(),
      icon: LogIn,
      chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Security events (7d)",
      value: stats.securityWeek.toLocaleString(),
      icon: ShieldAlert,
      chip: "bg-destructive/10 text-destructive",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit log</h1>
          <p className="text-sm text-muted-foreground">
            Append-only trail of significant actions (FR-10). Entries cannot be
            edited or deleted. Administrator only.
          </p>
        </div>
        <ExportCsvButton
          rows={exportRows}
          filename={`hbms-audit-${new Date().toISOString().slice(0, 10)}.csv`}
          label="Export CSV"
          className="self-start"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <span className={`rounded-lg p-2 ${card.chip}`} aria-hidden>
                <card.icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="size-4 text-muted-foreground" />
                System activity
              </CardTitle>
              <CardDescription>
                {total.toLocaleString()} matching entr
                {total === 1 ? "y" : "ies"} · page {page} of {totalPages}
              </CardDescription>
            </div>
          </div>

          <form
            method="get"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
          >
            <label className="space-y-1 text-xs text-muted-foreground">
              <span className="block">Search</span>
              <input
                name="q"
                defaultValue={q}
                placeholder="Actor, event, IP…"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span className="block">Event</span>
              <select
                name="action"
                defaultValue={actionFilter}
                className={`${selectClass} w-full`}
              >
                <option value="">All events</option>
                {options.actions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span className="block">Subject</span>
              <select
                name="subjectType"
                defaultValue={subjectType}
                className={`${selectClass} w-full`}
              >
                <option value="">All types</option>
                {options.subjectTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span className="block">From</span>
              <input
                type="date"
                name="from"
                defaultValue={from}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span className="block">To</span>
              <input
                type="date"
                name="to"
                defaultValue={to}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span className="block">Rows</span>
              <select
                name="pageSize"
                defaultValue={String(pageSize)}
                className={`${selectClass} w-full`}
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-6">
              <button
                type="submit"
                className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
              >
                Apply filters
              </button>
              {(actionFilter || subjectType || q || from || to || pageSize !== DEFAULT_PAGE_SIZE) && (
                <Link
                  href="/admin/activity"
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  Clear
                </Link>
              )}
            </div>
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
                    <Badge variant={actionTone(log.action)}>{log.action}</Badge>
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

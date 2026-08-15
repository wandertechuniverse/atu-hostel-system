import Link from "next/link";
import {
  Activity,
  BedDouble,
  Building2,
  Percent,
  TrendingUp,
  Users,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getAnalytics } from "@/lib/services/analytics";
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
import {
  DistributionList,
  HostelRevenueChart,
  TrendBars,
} from "@/components/admin/analytics-charts";
import { AnalyticsLiveBar } from "@/components/admin/analytics-live";
import { StatusBadge } from "@/components/ui/status-badge";
import { MobileField, MobileRecord } from "@/components/mobile-fields";
import { staffPath } from "@/lib/paths";

export const dynamic = "force-dynamic";

const ghs = (n: number) =>
  `GH₵ ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const session = await requireRole("MANAGER", "ADMIN");
  const sp = await searchParams;
  const days = Math.min(90, Math.max(7, Number(sp.days) || 30));
  const data = await getAnalytics(session, days);
  const isAdmin = session.role === "ADMIN";

  const bookingTotal = data.bookingsByStatus.reduce((s, i) => s + i.count, 0);
  const paymentTotal = data.paymentsByStatus.reduce((s, i) => s + i.count, 0);

  const statusTone: Record<string, string> = {
    PENDING: "bg-amber-500",
    CONFIRMED: "bg-emerald-500",
    CANCELLED: "bg-destructive",
    COMPLETED: "bg-sky-500",
    SUCCESS: "bg-emerald-500",
    FAILED: "bg-destructive",
  };

  const kpiCards = [
    {
      label: isAdmin ? "Students" : "Students (hostel)",
      value: data.kpis.students,
      icon: Users,
      chip: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    },
    {
      label: "Occupancy",
      value: `${data.kpis.occupancyPct}%`,
      icon: Percent,
      chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Confirmed bookings",
      value: data.kpis.confirmedBookings,
      icon: BedDouble,
      chip: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    },
    {
      label: "Verified revenue",
      value: ghs(data.kpis.revenue),
      icon: TrendingUp,
      chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
      label: "Pending payments",
      value: data.kpis.pendingPayments,
      icon: Wallet,
      chip: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    },
    {
      label: "Hostels · rooms",
      value: `${data.kpis.hostels} · ${data.kpis.rooms}`,
      icon: Building2,
      chip: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    },
  ];

  if (isAdmin) {
    kpiCards.push(
      {
        label: "Events today",
        value: data.kpis.activityToday,
        icon: Activity,
        chip: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
      },
      {
        label: "Failed logins (7d)",
        value: data.kpis.failedLogins7d,
        icon: AlertTriangle,
        chip: "bg-destructive/10 text-destructive",
      },
    );
  }

  const dayOptions = [7, 14, 30, 60, 90];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Live charts for bookings, revenue, and occupancy across all hostels."
              : "Live charts for your hostel only."}{" "}
            Figures are computed from bookings and payments - never stored aggregates.
          </p>
        </div>
        <form method="get" className="flex items-center gap-2">
          <label htmlFor="days" className="text-xs text-muted-foreground">
            Range
          </label>
          <select
            id="days"
            name="days"
            defaultValue={String(days)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
          >
            {dayOptions.map((d) => (
              <option key={d} value={d}>
                Last {d} days
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
          >
            Apply
          </button>
        </form>
      </div>

      <AnalyticsLiveBar />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Booking volume</CardTitle>
            <CardDescription>
              New booking requests per day · last {days} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrendBars points={data.bookingTrend} mode="count" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue collected</CardTitle>
            <CardDescription>
              Verified payments (SUCCESS) · last {days} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrendBars points={data.revenueTrend} mode="amount" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bookings by status</CardTitle>
            <CardDescription>{bookingTotal} total in scope</CardDescription>
          </CardHeader>
          <CardContent>
            <DistributionList
              total={bookingTotal}
              items={data.bookingsByStatus.map((s) => ({
                label: s.status,
                count: s.count,
                tone: statusTone[s.status] ?? "bg-primary",
              }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payments by status</CardTitle>
            <CardDescription>{paymentTotal} total in scope</CardDescription>
          </CardHeader>
          <CardContent>
            <DistributionList
              total={paymentTotal}
              items={data.paymentsByStatus.map((s) => ({
                label: s.status,
                count: s.count,
                tone: statusTone[s.status] ?? "bg-primary",
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Revenue by hostel</CardTitle>
            <CardDescription>
              Confirmed occupancy and verified revenue
            </CardDescription>
          </div>
          <Link
            href={staffPath(session.role, "/reports")}
            className="text-xs text-primary underline-offset-4 hover:underline"
          >
            Full reports →
          </Link>
        </CardHeader>
        <CardContent className="space-y-6">
          <HostelRevenueChart rows={data.revenueByHostel} />
          <div className="space-y-3 lg:hidden">
            {data.revenueByHostel.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                No hostels in scope.
              </p>
            )}
            {data.revenueByHostel.map((row) => (
              <MobileRecord key={row.id}>
                <MobileField label="Hostel">
                  <p className="font-medium">{row.name}</p>
                </MobileField>
                <MobileField label="Confirmed">{row.confirmed}</MobileField>
                <MobileField label="Revenue">
                  <span className="font-medium">{ghs(row.revenue)}</span>
                </MobileField>
              </MobileRecord>
            ))}
          </div>
          <div className="hidden min-w-0 overflow-x-auto lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hostel</TableHead>
                <TableHead className="text-right">Confirmed</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.revenueByHostel.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No hostels in scope.
                  </TableCell>
                </TableRow>
              )}
              {data.revenueByHostel.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-right">{row.confirmed}</TableCell>
                  <TableCell className="text-right">{ghs(row.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {isAdmin && data.topActions.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Top audit events</CardTitle>
              <CardDescription>Most frequent activity log actions · last {days} days</CardDescription>
            </div>
            <Link
              href="/admin/activity"
              className="text-xs text-primary underline-offset-4 hover:underline"
            >
              Open audit log →
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.topActions.map((a) => (
                <Link
                  key={a.action}
                  href={`/admin/activity?action=${encodeURIComponent(a.action)}`}
                  className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs hover:bg-muted"
                >
                  <StatusBadge status={a.action.includes("failed") ? "FAILED" : "PENDING"} />
                  <span className="font-mono">{a.action}</span>
                  <span className="text-muted-foreground">{a.count}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import Link from "next/link";
import {
  Users,
  Building2,
  BedDouble,
  Wallet,
  DatabaseBackup,
  LineChart,
  ScrollText,
  Bell,
  CalendarCheck2,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { bookingScopeWhere } from "@/lib/scoping";
import { ExportDatabaseButton } from "@/components/admin/export-database-button";
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
import { StatusBadge } from "@/components/ui/status-badge";
import { MobileField, MobileRecord } from "@/components/mobile-fields";
import { staffPath } from "@/lib/paths";

export const dynamic = "force-dynamic";

type AdminOverviewStats = {
  students: number;
  campus: number;
  priv: number;
  activeBookings: number;
  pendingBookings: number;
  pendingPayments: number;
  users: number;
  hostels: number;
  rooms: number;
  bookings: number;
  payments: number;
  activityLog: number;
  notifications: number;
};

type ManagerOverviewStats = {
  students: number;
  rooms: number;
  activeBookings: number;
  pendingBookings: number;
  pendingPayments: number;
};

export default async function AdminOverviewPage() {
  const session = await requireRole("MANAGER", "ADMIN");
  const isManager = session.role === "MANAGER";

  // Row-level security: all queries carry the role's scope at the source.
  const bookingWhere = bookingScopeWhere(session);
  // Neon is ~150ms RTT from many client networks: many small COUNT queries
  // do not parallelise well through the pooler. Prefer one multi-count SQL
  // round-trip for the dashboard cards, then fetch the small recent lists.
  const hostelId = session.hostelId ?? "__none__";

  const [stats, managedHostel, recentBookings, recentAudit] = await Promise.all([
    isManager
      ? db.$queryRaw<ManagerOverviewStats[]>`
          SELECT
            (SELECT count(DISTINCT b."userId")::int
               FROM "Booking" b
               JOIN "Room" r ON r.id = b."roomId"
              WHERE r."hostelId" = ${hostelId}) AS students,
            (SELECT count(*)::int FROM "Room" WHERE "hostelId" = ${hostelId}) AS rooms,
            (SELECT count(*)::int
               FROM "Booking" b
               JOIN "Room" r ON r.id = b."roomId"
              WHERE r."hostelId" = ${hostelId} AND b.status = 'CONFIRMED') AS "activeBookings",
            (SELECT count(*)::int
               FROM "Booking" b
               JOIN "Room" r ON r.id = b."roomId"
              WHERE r."hostelId" = ${hostelId} AND b.status = 'PENDING') AS "pendingBookings",
            (SELECT count(*)::int
               FROM "Payment" p
               JOIN "Booking" b ON b.id = p."bookingId"
               JOIN "Room" r ON r.id = b."roomId"
              WHERE r."hostelId" = ${hostelId} AND p.status = 'PENDING') AS "pendingPayments"
        `.then((rows) => rows[0]!)
      : db.$queryRaw<AdminOverviewStats[]>`
          SELECT
            (SELECT count(*)::int FROM "User" WHERE role = 'STUDENT') AS students,
            (SELECT count(*)::int FROM "Hostel" WHERE type = 'UNIVERSITY') AS campus,
            (SELECT count(*)::int FROM "Hostel" WHERE type = 'PRIVATE') AS priv,
            (SELECT count(*)::int FROM "Booking" WHERE status = 'CONFIRMED') AS "activeBookings",
            (SELECT count(*)::int FROM "Booking" WHERE status = 'PENDING') AS "pendingBookings",
            (SELECT count(*)::int FROM "Payment" WHERE status = 'PENDING') AS "pendingPayments",
            (SELECT count(*)::int FROM "User") AS users,
            (SELECT count(*)::int FROM "Hostel") AS hostels,
            (SELECT count(*)::int FROM "Room") AS rooms,
            (SELECT count(*)::int FROM "Booking") AS bookings,
            (SELECT count(*)::int FROM "Payment") AS payments,
            (SELECT count(*)::int FROM "ActivityLog") AS "activityLog",
            (SELECT count(*)::int FROM "Notification") AS notifications
        `.then((rows) => rows[0]!),
    isManager && session.hostelId
      ? db.hostel.findUnique({
          where: { id: session.hostelId },
          select: {
            name: true,
            location: true,
            isApproved: true,
          },
        })
      : Promise.resolve(null),
    db.booking.findMany({
      where: bookingWhere,
      include: {
        user: { select: { name: true } },
        room: { include: { hostel: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    isManager
      ? Promise.resolve(null)
      : db.activityLog.findMany({
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 6,
        }),
  ]);

  const students = stats.students;
  const activeBookings = stats.activeBookings;
  const pendingBookings = stats.pendingBookings;
  const pendingPayments = stats.pendingPayments;
  const campus = isManager ? 0 : (stats as AdminOverviewStats).campus;
  const priv = isManager ? 0 : (stats as AdminOverviewStats).priv;
  const exportCounts = isManager
    ? null
    : {
        users: (stats as AdminOverviewStats).users,
        hostels: (stats as AdminOverviewStats).hostels,
        rooms: (stats as AdminOverviewStats).rooms,
        bookings: (stats as AdminOverviewStats).bookings,
        payments: (stats as AdminOverviewStats).payments,
        activityLog: (stats as AdminOverviewStats).activityLog,
        notifications: (stats as AdminOverviewStats).notifications,
      };

  const cards = [
    {
      label: isManager ? "Students at your hostel" : "ATU students registered",
      value: students,
      icon: Users,
      chip: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    },
    {
      label: isManager ? "Rooms in your hostel" : "Hostels listed",
      value: isManager
        ? (stats as ManagerOverviewStats).rooms
        : `${campus} campus · ${priv} private`,
      icon: Building2,
      chip: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    },
    {
      label: "Confirmed bookings",
      value: activeBookings,
      icon: BedDouble,
      chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Pending requests",
      value: pendingBookings,
      icon: CalendarCheck2,
      chip: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    },
    {
      label: "Payments to verify",
      value: pendingPayments,
      icon: Wallet,
      chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isManager ? "Manager dashboard" : "Admin dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isManager
              ? managedHostel
                ? `${managedHostel.name} · ${managedHostel.location}${managedHostel.isApproved ? "" : " · unpublished"}`
                : "Scoped to your hostel only. No hostel assigned yet."
              : "Institution-wide occupancy, bookings and payments."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isManager && (
            <>
              <Link
                href={staffPath(session.role, "/hostels")}
                className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm hover:bg-muted"
              >
                <Building2 className="size-4" />
                Hostel & rooms
              </Link>
              <Link
                href={staffPath(session.role, "/bookings")}
                className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm hover:bg-muted"
              >
                <CalendarCheck2 className="size-4" />
                Bookings
              </Link>
              <Link
                href={staffPath(session.role, "/payments")}
                className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm hover:bg-muted"
              >
                <Wallet className="size-4" />
                Payments
              </Link>
            </>
          )}
          <Link
            href={staffPath(session.role, "/analytics")}
            className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm hover:bg-muted"
          >
            <LineChart className="size-4" />
            Analytics
          </Link>
          {!isManager && (
            <Link
              href="/admin/notifications"
              className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm hover:bg-muted"
            >
              <Bell className="size-4" />
              Notifications
            </Link>
          )}
          {!isManager && (
            <Link
              href="/admin/activity"
              className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm hover:bg-muted"
            >
              <ScrollText className="size-4" />
              Audit log
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <Card
            key={card.label}
            className="overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium leading-snug text-muted-foreground sm:text-sm">
                {card.label}
              </CardTitle>
              <span
                className={`rounded-lg p-2 ${card.chip}`}
                aria-hidden
              >
                <card.icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold tracking-tight break-words sm:text-2xl">
                {card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isManager && exportCounts && (
        <Card className="border-dashed">
          <CardHeader className="flex-col items-start justify-between gap-4 space-y-0 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DatabaseBackup className="size-4 text-muted-foreground" />
                Database export / backup
              </CardTitle>
              <CardDescription>
                Full JSON snapshot of every table - users (passwords excluded),
                hostels, rooms, bookings, payments, notifications and the
                audit log. Every export is recorded in the activity log.
              </CardDescription>
            </div>
            <ExportDatabaseButton counts={exportCounts} />
          </CardHeader>
        </Card>
      )}

      {!isManager && recentAudit && recentAudit.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Recent audit events</CardTitle>
              <CardDescription>Latest entries from the append-only activity log</CardDescription>
            </div>
            <Link
              href={staffPath(session.role, "/activity")}
              className="text-xs text-primary underline-offset-4 hover:underline"
            >
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recentAudit.map((log) => (
                <li
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-2 text-sm last:border-0"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {log.action}
                    </Badge>
                    <span className="text-muted-foreground">
                      {log.user?.name ?? "system"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Recent booking requests</CardTitle>
            <CardDescription>
              Latest submissions across {isManager ? "your hostel" : "all hostels"}.
            </CardDescription>
          </div>
          <Link
            href={staffPath(session.role, "/bookings")}
            className="text-xs text-primary underline-offset-4 hover:underline"
          >
            Manage bookings →
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 lg:hidden">
            {recentBookings.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No booking requests yet.
              </p>
            )}
            {recentBookings.map((booking) => (
              <MobileRecord key={booking.id}>
                <MobileField label="Student">
                  <p className="font-medium">{booking.user.name}</p>
                </MobileField>
                <MobileField label="Hostel">{booking.room.hostel.name}</MobileField>
                <MobileField label="Room">{booking.room.roomNumber}</MobileField>
                <MobileField label="Amount">
                  <span className="font-medium">
                    GH₵ {booking.amount.toLocaleString()}
                  </span>
                </MobileField>
                <MobileField label="Status">
                  <StatusBadge status={booking.status} />
                </MobileField>
              </MobileRecord>
            ))}
          </div>
          <div className="hidden min-w-0 overflow-x-auto lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Hostel</TableHead>
                <TableHead>Room</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentBookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No booking requests yet.
                  </TableCell>
                </TableRow>
              )}
              {recentBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">{booking.user.name}</TableCell>
                  <TableCell>{booking.room.hostel.name}</TableCell>
                  <TableCell>
                    {booking.room.roomNumber} · {booking.room.roomType}
                  </TableCell>
                  <TableCell className="text-right">
                    GH₵ {booking.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={booking.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

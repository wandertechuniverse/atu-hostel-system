import { Users, Building2, BedDouble, Wallet, DatabaseBackup } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { bookingScopeWhere, hostelScopeWhere } from "@/lib/scoping";
import { ExportDatabaseButton } from "@/components/admin/export-database-button";
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

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const session = await requireRole("MANAGER", "ADMIN");
  const isManager = session.role === "MANAGER";

  // Row-level security: all queries carry the role's scope at the source.
  const bookingWhere = bookingScopeWhere(session);
  const paymentWhere = isManager
    ? { booking: { room: { hostelId: session.hostelId ?? "__none__" } } }
    : {};

  const [students, hostelsByType, activeBookings, pendingPayments, recentBookings, exportCounts] =
    await Promise.all([
      isManager
        ? db.booking
            .findMany({
              where: bookingWhere,
              distinct: ["userId"],
              select: { userId: true },
            })
            .then((rows) => rows.length)
        : db.user.count({ where: { role: "STUDENT" } }),
      db.hostel.groupBy({
        by: ["type"],
        where: hostelScopeWhere(session),
        _count: { _all: true },
      }),
      db.booking.count({ where: { ...bookingWhere, status: "CONFIRMED" } }),
      db.payment.count({ where: { ...paymentWhere, status: "PENDING" } }),
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
        ? null
        : Promise.all([
            db.user.count(),
            db.hostel.count(),
            db.room.count(),
            db.booking.count(),
            db.payment.count(),
            db.activityLog.count(),
          ]).then(([users, hostels, rooms, bookings, payments, activityLog]) => ({
            users,
            hostels,
            rooms,
            bookings,
            payments,
            activityLog,
          })),
    ]);

  const countOf = (h: (typeof hostelsByType)[number] | undefined) =>
    (h?._count as { _all: number } | undefined)?. _all ?? 0;
  const campus = countOf(hostelsByType.find((h) => h.type === "UNIVERSITY"));
  const priv = countOf(hostelsByType.find((h) => h.type === "PRIVATE"));

  const cards = [
    {
      label: isManager ? "Students at your hostel" : "ATU students registered",
      value: students,
      icon: Users,
      chip: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    },
    {
      label: "Hostels listed",
      value: `${campus} campus · ${priv} private`,
      icon: Building2,
      chip: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    },
    {
      label: "Active room bookings",
      value: activeBookings,
      icon: BedDouble,
      chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Payments pending verification",
      value: pendingPayments,
      icon: Wallet,
      chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isManager ? "Hostel overview" : "Overview"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isManager
            ? "Scoped to your hostel only."
            : "Institution-wide occupancy, bookings and payments."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card
            key={card.label}
            className="overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
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
              <div className="text-2xl font-bold tracking-tight">
                {card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isManager && exportCounts && (
        <Card className="border-dashed">
          <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DatabaseBackup className="size-4 text-muted-foreground" />
                Database export / backup
              </CardTitle>
              <CardDescription>
                Full JSON snapshot of every table - users (passwords excluded),
                hostels, rooms, bookings, payments and the audit log. Every
                export is recorded in the activity log.
              </CardDescription>
            </div>
            <ExportDatabaseButton counts={exportCounts} />
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent booking requests</CardTitle>
          <CardDescription>
            Latest submissions across {isManager ? "your hostel" : "all hostels"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}

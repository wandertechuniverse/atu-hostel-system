import { BedDouble, Percent, TrendingUp, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { hostelScopeWhere, paymentScopeWhere } from "@/lib/scoping";
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
  ReportsRecords,
  type ReportRecord,
} from "@/components/admin/reports-records";
import { MobileField, MobileRecord } from "@/components/mobile-fields";

export const dynamic = "force-dynamic";

const ghs = (value: number) => `GH₵ ${value.toLocaleString()}`;

export default async function AdminReportsPage() {
  const session = await requireRole("MANAGER", "ADMIN");
  const isManager = session.role === "MANAGER";

  // Row-level security: hostels and payments are scoped at the source.
  // Filtered relation counts avoid loading every booking id into memory.
  const bookingWhere = isManager
    ? { room: { hostelId: session.hostelId ?? "__none__" } }
    : {};

  const [hostels, pendingPayments, bookingsForExport] = await Promise.all([
    db.hostel.findMany({
      where: hostelScopeWhere(session),
      select: {
        id: true,
        name: true,
        rooms: {
          select: {
            capacity: true,
            _count: {
              select: { bookings: { where: { status: "CONFIRMED" } } },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.payment.count({
      where: { ...paymentScopeWhere(session), status: "PENDING" },
    }),
    db.booking.findMany({
      where: bookingWhere,
      select: {
        id: true,
        amount: true,
        status: true,
        academicSession: true,
        user: { select: { name: true, studentIdNumber: true } },
        room: {
          select: {
            roomNumber: true,
            roomType: true,
            hostel: { select: { id: true, name: true } },
          },
        },
        payment: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Occupancy is derived: confirmed bookings against total bed capacity.
  const rows = hostels.map((hostel) => {
    const totalBeds = hostel.rooms.reduce((sum, room) => sum + room.capacity, 0);
    const confirmed = hostel.rooms.reduce(
      (sum, room) => sum + room._count.bookings,
      0,
    );
    const revenue = bookingsForExport
      .filter(
        (b) => b.room.hostel.id === hostel.id && b.payment?.status === "SUCCESS",
      )
      .reduce((sum, b) => sum + b.amount, 0);
    return {
      id: hostel.id,
      name: hostel.name,
      rooms: hostel.rooms.length,
      totalBeds,
      confirmed,
      occupancy: totalBeds > 0 ? Math.round((confirmed / totalBeds) * 100) : 0,
      revenue,
    };
  });

  const totalBeds = rows.reduce((s, r) => s + r.totalBeds, 0);
  const totalConfirmed = rows.reduce((s, r) => s + r.confirmed, 0);
  const occupancyRate =
    totalBeds > 0 ? Math.round((totalConfirmed / totalBeds) * 100) : 0;
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);

  const cards = [
    {
      label: "Occupancy rate",
      value: `${occupancyRate}%`,
      icon: Percent,
      chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Rooms occupied",
      value: `${totalConfirmed} of ${totalBeds} beds`,
      icon: BedDouble,
      chip: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    },
    {
      label: "Revenue collected",
      value: ghs(totalRevenue),
      icon: TrendingUp,
      chip: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    },
    {
      label: "Payments pending verification",
      value: pendingPayments,
      icon: Wallet,
      chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
  ];

  const records: ReportRecord[] = bookingsForExport.map((booking) => ({
    id: booking.id,
    student: booking.user.name,
    studentIdNumber: booking.user.studentIdNumber ?? "",
    hostel: booking.room.hostel.name,
    room: `${booking.room.roomNumber} (${booking.room.roomType})`,
    session: booking.academicSession,
    amount: booking.amount,
    status: booking.status,
    payment: booking.payment?.status ?? "UNPAID",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          {isManager
            ? "Occupancy and revenue for your hostel only."
            : "Institution-wide occupancy, revenue and accommodation records."}
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
        <CardHeader>
          <CardTitle>Occupancy by hostel</CardTitle>
          <CardDescription>
            Confirmed bookings against total bed capacity, with verified revenue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Pure-CSS bar chart - no charting dependency needed. */}
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{row.name}</span>
                  <span className="text-muted-foreground">
                    {row.confirmed}/{row.totalBeds} beds · {row.occupancy}%
                  </span>
                </div>
                <div
                  className="h-2.5 overflow-hidden rounded-full bg-muted"
                  role="img"
                  aria-label={`${row.name} occupancy ${row.occupancy}%`}
                >
                  <div
                    className={`h-full rounded-full ${
                      row.occupancy >= 75
                        ? "bg-destructive"
                        : row.occupancy >= 40
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    }`}
                    style={{ width: `${row.occupancy}%` }}
                  />
                </div>
              </div>
            ))}
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground">No hostels in scope.</p>
            )}
          </div>

          <div className="space-y-3 lg:hidden">
            {rows.map((row) => (
              <MobileRecord key={row.id}>
                <MobileField label="Hostel">
                  <p className="font-medium">{row.name}</p>
                </MobileField>
                <MobileField label="Rooms">{row.rooms}</MobileField>
                <MobileField label="Beds">
                  {row.confirmed}/{row.totalBeds} occupied
                </MobileField>
                <MobileField label="Occupancy">{row.occupancy}%</MobileField>
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
                <TableHead className="text-right">Rooms</TableHead>
                <TableHead className="text-right">Beds</TableHead>
                <TableHead className="text-right">Occupied</TableHead>
                <TableHead className="text-right">Occupancy</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-right">{row.rooms}</TableCell>
                  <TableCell className="text-right">{row.totalBeds}</TableCell>
                  <TableCell className="text-right">{row.confirmed}</TableCell>
                  <TableCell className="text-right font-medium">
                    {row.occupancy}%
                  </TableCell>
                  <TableCell className="text-right">
                    {ghs(row.revenue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <ReportsRecords records={records} isManager={isManager} />
    </div>
  );
}

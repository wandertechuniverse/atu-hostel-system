import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { bookingScopeWhere } from "@/lib/scoping";
import type { BookingStatus } from "@/generated/prisma/enums";
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
import { BookingRowActions } from "@/components/admin/booking-row-actions";

export const dynamic = "force-dynamic";

const STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"] as const;

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const session = await requireRole("MANAGER", "ADMIN");
  const isManager = session.role === "MANAGER";
  const sp = await searchParams;
  const statusFilter = (sp.status?.trim().toUpperCase() ?? "") as string;
  const q = sp.q?.trim() ?? "";

  const status =
    STATUSES.includes(statusFilter as (typeof STATUSES)[number])
      ? (statusFilter as BookingStatus)
      : undefined;

  const bookings = await db.booking.findMany({
    where: {
      ...bookingScopeWhere(session),
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { user: { name: { contains: q, mode: "insensitive" } } },
              { user: { studentIdNumber: { contains: q, mode: "insensitive" } } },
              { room: { roomNumber: { contains: q, mode: "insensitive" } } },
              { room: { hostel: { name: { contains: q, mode: "insensitive" } } } },
            ],
          }
        : {}),
    },
    include: {
      user: { select: { name: true, studentIdNumber: true } },
      room: {
        select: {
          roomNumber: true,
          roomType: true,
          hostel: { select: { name: true } },
        },
      },
      payment: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const counts = await db.booking.groupBy({
    by: ["status"],
    where: bookingScopeWhere(session),
    _count: { _all: true },
  });
  const countMap = Object.fromEntries(
    counts.map((c) => [c.status, c._count._all]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
        <p className="text-sm text-muted-foreground">
          {isManager
            ? "Approve or reject booking requests for your hostel only."
            : "Approve or reject booking requests across all hostels."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/bookings"
          className={`rounded-full border px-3 py-1 text-xs ${
            !status ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          }`}
        >
          All ({Object.values(countMap).reduce((a, b) => a + b, 0)})
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/bookings?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`rounded-full border px-3 py-1 text-xs ${
              status === s
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            {s} ({countMap[s] ?? 0})
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div>
            <CardTitle>Booking requests</CardTitle>
            <CardDescription>
              {bookings.length} request{bookings.length === 1 ? "" : "s"}
              {status ? ` · ${status}` : ""} · newest first
            </CardDescription>
          </div>
          <form method="get" className="flex flex-wrap items-end gap-2">
            {status && <input type="hidden" name="status" value={status} />}
            <label className="space-y-1 text-xs text-muted-foreground">
              <span className="block">Search</span>
              <input
                name="q"
                defaultValue={q}
                placeholder="Student, hostel, room…"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
            >
              Search
            </button>
            {q && (
              <Link
                href={status ? `/admin/bookings?status=${status}` : "/admin/bookings"}
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
                <TableHead>Student</TableHead>
                <TableHead>Hostel</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Session</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No booking requests match.
                  </TableCell>
                </TableRow>
              )}
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    <div className="font-medium">{booking.user.name}</div>
                    {booking.user.studentIdNumber && (
                      <div className="text-xs text-muted-foreground">
                        {booking.user.studentIdNumber}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{booking.room.hostel.name}</TableCell>
                  <TableCell>
                    {booking.room.roomNumber} · {booking.room.roomType}
                  </TableCell>
                  <TableCell>{booking.academicSession}</TableCell>
                  <TableCell className="text-right">
                    GH₵ {booking.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={booking.status} />
                  </TableCell>
                  <TableCell>
                    {booking.payment ? (
                      <StatusBadge status={booking.payment.status} />
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <BookingRowActions booking={booking} />
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

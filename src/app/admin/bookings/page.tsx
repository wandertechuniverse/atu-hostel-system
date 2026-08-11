import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { bookingScopeWhere } from "@/lib/scoping";
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

export default async function AdminBookingsPage() {
  const session = await requireRole("MANAGER", "ADMIN");
  const isManager = session.role === "MANAGER";

  // Row-level security: managers only ever load their own hostel's bookings.
  const bookings = await db.booking.findMany({
    where: bookingScopeWhere(session),
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

      <Card>
        <CardHeader>
          <CardTitle>Booking requests</CardTitle>
          <CardDescription>
            {bookings.length} request{bookings.length === 1 ? "" : "s"} · newest
            first
          </CardDescription>
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
                    No booking requests yet.
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
                    {/* Keyed on status so the Approve/Reject/Verify buttons
                        reflect the saved state after revalidation. */}
                    <BookingRowActions
                      key={`${booking.id}:${booking.status}:${booking.payment?.status ?? "none"}`}
                      booking={booking}
                    />
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

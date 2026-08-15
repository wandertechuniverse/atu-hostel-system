import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import { homeForRole, requireSession } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReceiptDialog } from "@/components/student/receipt-dialog";
import { PayDialog } from "@/components/student/pay-dialog";
import { BookingSuccessToast } from "@/components/student/booking-success-toast";
import {
  MobileField,
  MobileFieldRow,
  MobileRecord,
} from "@/components/mobile-fields";

export const dynamic = "force-dynamic";

export default async function MyBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const sp = await searchParams;
  const justSubmitted = sp.submitted === "1";
  const session = await requireSession();
  if (session.role !== "STUDENT") redirect(homeForRole(session.role));

  // Row-level security: a student only ever sees their own bookings.
  const bookings = await db.booking.findMany({
    where: { userId: session.userId },
    include: {
      user: { select: { name: true, studentIdNumber: true } },
      room: { include: { hostel: true } },
      payment: {
        select: { status: true, reference: true, amountPaid: true, paymentDate: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        {justSubmitted && <BookingSuccessToast />}
        {justSubmitted && (
          <div
            role="status"
            className="mb-6 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
          >
            <CheckCircle2 className="size-4" />
            Booking request submitted - it is now pending manager approval.
          </div>
        )}
        <h1 className="text-2xl font-bold tracking-tight">My bookings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Requests are confirmed by the hostel manager once payment is verified.
        </p>

        {bookings.length === 0 ? (
          <p className="mt-8 rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            You have no bookings yet.{" "}
            <a href="/" className="text-primary underline underline-offset-4">
              Find a hostel
            </a>{" "}
            to get started.
          </p>
        ) : (
          <>
          <div className="mt-6 space-y-3 lg:hidden">
            {bookings.map((booking) => (
              <MobileRecord key={booking.id}>
                <MobileField label="Hostel">
                  <p className="font-medium">{booking.room.hostel.name}</p>
                </MobileField>
                <MobileField label="Room">
                  {booking.room.roomNumber} · {booking.room.roomType}
                </MobileField>
                <MobileField label="Session">{booking.academicSession}</MobileField>
                <MobileField label="Amount">
                  <span className="font-medium">
                    GH₵ {booking.amount.toLocaleString()}
                  </span>
                </MobileField>
                <MobileFieldRow>
                  <MobileField label="Status">
                    <StatusBadge status={booking.status} />
                  </MobileField>
                  <MobileField label="Payment">
                    {booking.payment ? (
                      <StatusBadge status={booking.payment.status} />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </MobileField>
                </MobileFieldRow>
                <div>
                  {booking.payment?.status === "SUCCESS" ? (
                    <ReceiptDialog
                      booking={{
                        id: booking.id,
                        amount: booking.amount,
                        academicSession: booking.academicSession,
                        status: booking.status,
                        createdAt: booking.createdAt,
                        user: booking.user,
                        room: {
                          roomNumber: booking.room.roomNumber,
                          roomType: booking.room.roomType,
                          hostel: {
                            name: booking.room.hostel.name,
                            location: booking.room.hostel.location,
                          },
                        },
                        payment: booking.payment
                          ? {
                              reference: booking.payment.reference,
                              amountPaid: booking.payment.amountPaid,
                              paymentDate: booking.payment.paymentDate,
                              status: booking.payment.status,
                            }
                          : null,
                      }}
                    />
                  ) : booking.payment?.status === "PENDING" ? (
                    <span className="text-xs text-muted-foreground">
                      Awaiting verification
                    </span>
                  ) : booking.status === "CONFIRMED" ? (
                    <PayDialog bookingId={booking.id} amount={booking.amount} />
                  ) : null}
                </div>
              </MobileRecord>
            ))}
          </div>
          <div className="mt-6 hidden min-w-0 overflow-x-auto lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hostel</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Session</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">
                    {booking.room.hostel.name}
                  </TableCell>
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
                    {booking.payment?.status === "SUCCESS" ? (
                      <ReceiptDialog
                        key={booking.id}
                        booking={{
                          id: booking.id,
                          amount: booking.amount,
                          academicSession: booking.academicSession,
                          status: booking.status,
                          createdAt: booking.createdAt,
                          user: booking.user,
                          room: {
                            roomNumber: booking.room.roomNumber,
                            roomType: booking.room.roomType,
                            hostel: {
                              name: booking.room.hostel.name,
                              location: booking.room.hostel.location,
                            },
                          },
                          payment: booking.payment
                            ? {
                                reference: booking.payment.reference,
                                amountPaid: booking.payment.amountPaid,
                                paymentDate: booking.payment.paymentDate,
                                status: booking.payment.status,
                              }
                            : null,
                        }}
                      />
                    ) : booking.payment?.status === "PENDING" ? (
                      <span className="text-xs text-muted-foreground">
                        Awaiting verification
                      </span>
                    ) : booking.status === "CONFIRMED" ? (
                      <PayDialog bookingId={booking.id} amount={booking.amount} />
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
          </>
        )}
    </main>
  );
}

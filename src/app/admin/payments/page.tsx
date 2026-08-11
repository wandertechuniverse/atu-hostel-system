import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { paymentScopeWhere } from "@/lib/scoping";
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
import { VerifyPaymentButton } from "@/components/admin/verify-payment-button";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const session = await requireRole("MANAGER", "ADMIN");
  const isManager = session.role === "MANAGER";

  // Row-level security: managers only see payments for their own hostel.
  const payments = await db.payment.findMany({
    where: paymentScopeWhere(session),
    include: {
      booking: {
        select: {
          id: true,
          amount: true,
          user: { select: { name: true, studentIdNumber: true } },
          room: {
            select: { roomNumber: true, hostel: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground">
          {isManager
            ? "Verify accommodation receipts for your hostel only."
            : "Verify accommodation receipts across all hostels."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment records</CardTitle>
          <CardDescription>
            {payments.length} payment{payments.length === 1 ? "" : "s"} · mock
            gateway, no real money (docs/05-payment-flow.md)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Hostel</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No payments yet. Verified bookings appear here.
                  </TableCell>
                </TableRow>
              )}
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <div className="font-medium">{payment.booking.user.name}</div>
                    {payment.booking.user.studentIdNumber && (
                      <div className="text-xs text-muted-foreground">
                        {payment.booking.user.studentIdNumber}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{payment.booking.room.hostel.name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {payment.reference}
                  </TableCell>
                  <TableCell className="text-right">
                    GH₵ {payment.amountPaid.toLocaleString()}
                  </TableCell>
                  <TableCell>{payment.method}</TableCell>
                  <TableCell>
                    <StatusBadge status={payment.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.status === "PENDING" ? (
                      <VerifyPaymentButton bookingId={payment.booking.id} />
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
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

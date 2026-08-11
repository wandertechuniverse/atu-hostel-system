import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { paymentScopeWhere } from "@/lib/scoping";
import type { PaymentStatus } from "@/generated/prisma/enums";
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

const STATUSES = ["PENDING", "SUCCESS", "FAILED"] as const;

export default async function AdminPaymentsPage({
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
      ? (statusFilter as PaymentStatus)
      : undefined;

  const baseWhere = paymentScopeWhere(session);

  const payments = await db.payment.findMany({
    where: {
      ...baseWhere,
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { reference: { contains: q } },
              { booking: { user: { name: { contains: q } } } },
              { booking: { user: { studentIdNumber: { contains: q } } } },
              { booking: { room: { hostel: { name: { contains: q } } } } },
            ],
          }
        : {}),
    },
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

  const counts = await db.payment.groupBy({
    by: ["status"],
    where: baseWhere,
    _count: { _all: true },
  });
  const countMap = Object.fromEntries(
    counts.map((c) => [c.status, c._count._all]),
  );

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

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/payments"
          className={`rounded-full border px-3 py-1 text-xs ${
            !status ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          }`}
        >
          All ({Object.values(countMap).reduce((a, b) => a + b, 0)})
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/payments?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
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
            <CardTitle>Payment records</CardTitle>
            <CardDescription>
              {payments.length} payment{payments.length === 1 ? "" : "s"}
              {status ? ` · ${status}` : ""} · mock gateway, no real money
            </CardDescription>
          </div>
          <form method="get" className="flex flex-wrap items-end gap-2">
            {status && <input type="hidden" name="status" value={status} />}
            <label className="space-y-1 text-xs text-muted-foreground">
              <span className="block">Search</span>
              <input
                name="q"
                defaultValue={q}
                placeholder="Reference, student, hostel…"
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
                href={status ? `/admin/payments?status=${status}` : "/admin/payments"}
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
                    No payments match.
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

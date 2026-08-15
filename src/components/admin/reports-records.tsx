"use client";

import { useMemo, useState } from "react";
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
import { StatusBadge } from "@/components/ui/status-badge";
import {
  MobileField,
  MobileFieldRow,
  MobileRecord,
} from "@/components/mobile-fields";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type ReportRecord = {
  id: string;
  student: string;
  studentIdNumber: string;
  hostel: string;
  room: string;
  session: string;
  amount: number;
  status: string;
  payment: string;
};

const PAGE_SIZES = [10, 25, 50, 100] as const;

const ghs = (value: number) => `GH₵ ${value.toLocaleString()}`;

/**
 * Client-side filter + page-size controls for accommodation records CSV export.
 * Filters apply to both the table and the exported CSV so staff export what they see.
 */
export function ReportsRecords({
  records,
  isManager,
}: {
  records: ReportRecord[];
  isManager: boolean;
}) {
  const [status, setStatus] = useState("");
  const [payment, setPayment] = useState("");
  const [hostel, setHostel] = useState("");
  const [session, setSession] = useState("");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(25);
  const [page, setPage] = useState(1);

  const hostels = useMemo(
    () => [...new Set(records.map((r) => r.hostel))].sort(),
    [records],
  );
  const sessions = useMemo(
    () => [...new Set(records.map((r) => r.session))].sort(),
    [records],
  );
  const statuses = useMemo(
    () => [...new Set(records.map((r) => r.status))].sort(),
    [records],
  );
  const payments = useMemo(
    () => [...new Set(records.map((r) => r.payment))].sort(),
    [records],
  );

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (status && r.status !== status) return false;
      if (payment && r.payment !== payment) return false;
      if (hostel && r.hostel !== hostel) return false;
      if (session && r.session !== session) return false;
      return true;
    });
  }, [records, status, payment, hostel, session]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const exportRows = filtered.map((r) => ({
    Student: r.student,
    "Index number": r.studentIdNumber,
    Hostel: r.hostel,
    Room: r.room,
    Session: r.session,
    "Amount (GHS)": r.amount,
    Status: r.status,
    Payment: r.payment,
  }));

  function resetFilters() {
    setStatus("");
    setPayment("");
    setHostel("");
    setSession("");
    setPage(1);
  }

  const selectClass =
    "h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

  return (
    <Card>
      <CardHeader className="gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Accommodation records</CardTitle>
          <CardDescription>
            Every booking {isManager ? "at your hostel" : "in the system"}, newest
            first. Filters apply to the table and the CSV export.
          </CardDescription>
        </div>
        <ExportCsvButton
          rows={exportRows}
          filename={`hbms-bookings-${new Date().toISOString().slice(0, 10)}.csv`}
          label="Export records"
          className="self-start"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block">Status</span>
            <select
              className={selectClass}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block">Payment</span>
            <select
              className={selectClass}
              value={payment}
              onChange={(e) => {
                setPayment(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              {payments.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          {!isManager && (
            <label className="space-y-1 text-xs text-muted-foreground">
              <span className="block">Hostel</span>
              <select
                className={selectClass}
                value={hostel}
                onChange={(e) => {
                  setHostel(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All</option>
                {hostels.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block">Session</span>
            <select
              className={selectClass}
              value={session}
              onChange={(e) => {
                setSession(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              {sessions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block">Rows per page</span>
            <select
              className={selectClass}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value) as (typeof PAGE_SIZES)[number]);
                setPage(1);
              }}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          {(status || payment || hostel || session) && (
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
              Clear filters
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Showing {pageRows.length} of {filtered.length} filtered record
          {filtered.length === 1 ? "" : "s"}
          {filtered.length !== records.length
            ? ` (${records.length} total)`
            : ""}
          {" · "}
          page {safePage} of {totalPages}
        </p>

        <div className="space-y-3 lg:hidden">
          {pageRows.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No bookings match these filters.
            </p>
          )}
          {pageRows.map((booking) => (
            <MobileRecord key={booking.id}>
              <MobileField label="Student">
                <p className="font-medium">{booking.student}</p>
                {booking.studentIdNumber ? (
                  <p className="text-xs text-muted-foreground break-all">
                    {booking.studentIdNumber}
                  </p>
                ) : null}
              </MobileField>
              <MobileField label="Hostel">{booking.hostel}</MobileField>
              <MobileField label="Room">{booking.room}</MobileField>
              <MobileField label="Session">{booking.session}</MobileField>
              <MobileField label="Amount">
                <span className="font-medium">{ghs(booking.amount)}</span>
              </MobileField>
              <MobileFieldRow>
                <MobileField label="Status">
                  <StatusBadge status={booking.status} />
                </MobileField>
                <MobileField label="Payment">
                  {booking.payment === "UNPAID" ? (
                    <span className="text-muted-foreground">Unpaid</span>
                  ) : (
                    <StatusBadge status={booking.payment} />
                  )}
                </MobileField>
              </MobileFieldRow>
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
              <TableHead>Session</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No bookings match these filters.
                </TableCell>
              </TableRow>
            )}
            {pageRows.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-medium">
                  {booking.student}
                  {booking.studentIdNumber && (
                    <span className="block text-xs text-muted-foreground">
                      {booking.studentIdNumber}
                    </span>
                  )}
                </TableCell>
                <TableCell>{booking.hostel}</TableCell>
                <TableCell>{booking.room}</TableCell>
                <TableCell>{booking.session}</TableCell>
                <TableCell className="text-right">{ghs(booking.amount)}</TableCell>
                <TableCell>
                  <StatusBadge status={booking.status} />
                </TableCell>
                <TableCell>
                  {booking.payment === "UNPAID" ? (
                    <span className="text-xs text-muted-foreground">-</span>
                  ) : (
                    <StatusBadge status={booking.payment} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {safePage} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

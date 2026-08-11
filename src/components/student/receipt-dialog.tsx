"use client";

import { useState } from "react";
import { Building2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";

export type ReceiptBooking = {
  id: string;
  amount: number;
  academicSession: string;
  status: string;
  createdAt: Date;
  user: { name: string; studentIdNumber: string | null };
  room: {
    roomNumber: string;
    roomType: string;
    hostel: { name: string; location: string };
  };
  payment: {
    reference: string;
    amountPaid: number;
    paymentDate: Date | null;
    status: string;
  } | null;
};

const ghs = (value: number) => `GH₵ ${value.toLocaleString()}`;

export function ReceiptDialog({ booking }: { booking: ReceiptBooking }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Printer className="size-3.5" />
        Receipt
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment receipt</DialogTitle>
        </DialogHeader>

        {/* .print-receipt is the only thing visible when printing (globals.css). */}
        <div className="print-receipt space-y-4 rounded-lg border bg-card p-6 text-sm">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2 font-semibold">
              <Building2 className="size-5" />
              ATU Hostel Booking
            </div>
            <span className="text-xs text-muted-foreground">PROOF OF PAYMENT</span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Student</p>
              <p className="font-medium">{booking.user.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Index number</p>
              <p className="font-medium">{booking.user.studentIdNumber ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hostel</p>
              <p className="font-medium">{booking.room.hostel.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Room</p>
              <p className="font-medium">
                {booking.room.roomNumber} · {booking.room.roomType}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Academic session</p>
              <p className="font-medium">{booking.academicSession}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reference</p>
              <p className="font-mono text-xs">{booking.payment?.reference ?? "-"}</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
            <span className="text-muted-foreground">Amount paid</span>
            <span className="text-lg font-bold">
              {ghs(booking.payment?.amountPaid ?? booking.amount)}
            </span>
          </div>

          <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
            <span>
              Paid {booking.payment?.paymentDate
                ? new Date(booking.payment.paymentDate).toLocaleDateString("en-GB")
                : "-"}
            </span>
            <StatusBadge status={booking.payment?.status ?? "UNPAID"} />
          </div>
        </div>

        <div className="flex justify-end print:hidden">
          <Button onClick={() => window.print()}>
            <Printer className="size-4" />
            Print / save PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

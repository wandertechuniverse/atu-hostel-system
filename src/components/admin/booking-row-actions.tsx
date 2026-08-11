"use client";

import { useEffect, useRef } from "react";
import { CsrfInput } from "@/components/csrf-input";
import { useActionState } from "react";
import { CheckCircle2, Wallet, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  bookingAdminAction,
  type AdminActionResult,
} from "@/lib/actions/admin";

type RowBooking = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  payment: { status: "PENDING" | "SUCCESS" | "FAILED" } | null;
};

const initial: AdminActionResult = {};

export function BookingRowActions({ booking }: { booking: RowBooking }) {
  const [state, formAction, pending] = useActionState(
    bookingAdminAction,
    initial,
  );

  // Fire a toast only for real action results (initial state is {}).
  const prevOk = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (prevOk.current !== undefined) {
      if (state.ok) toast.success("Booking updated");
      else if (state.error) toast.error(state.error);
    }
    prevOk.current = state.ok;
  }, [state]);

  const isPending = booking.status === "PENDING";
  const canVerify = booking.payment?.status !== "SUCCESS";

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <CsrfInput />
      <input type="hidden" name="bookingId" value={booking.id} />
      {state && "error" in state && state.error && (
        <p className="text-right text-xs text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <div className="flex items-center justify-end gap-1.5">
        {isPending && (
          <Button
            type="submit"
            size="sm"
            variant="outline"
            name="intent"
            value="reject"
            disabled={pending}
          >
            <XCircle />
            Reject
          </Button>
        )}
        {isPending && (
          <Button
            type="submit"
            size="sm"
            name="intent"
            value="approve"
            disabled={pending}
          >
            <CheckCircle2 />
            Approve
          </Button>
        )}
        {canVerify && (
          <Button
            type="submit"
            size="sm"
            variant="outline"
            name="intent"
            value="verify"
            disabled={pending}
          >
            <Wallet />
            Verify
          </Button>
        )}
        {!isPending && !canVerify && (
          <span className="text-xs text-muted-foreground">No actions</span>
        )}
      </div>
    </form>
  );
}

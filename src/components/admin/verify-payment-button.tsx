"use client";

import { useActionState, useEffect, useRef } from "react";
import { CsrfInput } from "@/components/csrf-input";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  verifyPaymentFormAction,
  type AdminActionResult,
} from "@/lib/actions/admin";

const initial: AdminActionResult = { ok: true };

export function VerifyPaymentButton({ bookingId }: { bookingId: string }) {
  const [state, formAction, pending] = useActionState(
    verifyPaymentFormAction,
    initial,
  );
  const seen = useRef(false);
  useEffect(() => {
    if (!seen.current) {
      seen.current = true;
      return;
    }
    if (state.ok) toast.success("Payment verified");
    else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <CsrfInput />
      <input type="hidden" name="bookingId" value={bookingId} />
      {state && "error" in state && state.error && (
        <p className="text-right text-xs text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Verifying…" : "Verify"}
      </Button>
    </form>
  );
}

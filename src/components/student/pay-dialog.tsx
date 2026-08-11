"use client";

import { useActionState, useEffect, useState } from "react";
import { CsrfInput } from "@/components/csrf-input";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitPaymentAction, type PaymentFormState } from "@/lib/actions/booking";

const initial: PaymentFormState = {};

const PROVIDERS = [
  { value: "MTN_MOMO", label: "MTN MoMo" },
  { value: "TELECEL_CASH", label: "Telecel Cash" },
  { value: "AT_MONEY", label: "AT Money" },
];

export function PayDialog({
  bookingId,
  amount,
}: {
  bookingId: string;
  amount: number;
}) {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState("MTN_MOMO");
  const [state, formAction, pending] = useActionState(
    submitPaymentAction,
    initial,
  );

  useEffect(() => {
    if (state.ok) {
      toast.success("Payment submitted", {
        description: "It will show here once the hostel manager verifies it.",
      });
      setOpen(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Wallet className="size-3.5" />
        Pay now
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Pay with Mobile Money</DialogTitle>
          <DialogDescription>
            Amount: GH₵ {amount.toLocaleString()} per academic year. This is a
            simulated payment - enter the reference from your MoMo prompt.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
      <CsrfInput />
          <input type="hidden" name="bookingId" value={bookingId} />
          {state.error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="pay-provider">Provider</Label>
            <select
              id="pay-provider"
              name="provider"
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-phone">MoMo phone number</Label>
            <Input
              id="pay-phone"
              name="phone"
              type="tel"
              placeholder="e.g. 024 000 0000"
              autoComplete="off"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-reference">Transaction reference</Label>
            <Input
              id="pay-reference"
              name="reference"
              placeholder="e.g. TRX-982314"
              autoComplete="off"
              required
            />
            <p className="text-xs text-muted-foreground">
              For the demo, any code works - the manager verifies it on their side.
            </p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Submitting…" : `Pay GH₵ ${amount.toLocaleString()}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

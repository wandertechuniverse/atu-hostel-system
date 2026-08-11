"use client";

import { useActionState, useState } from "react";
import { CsrfInput } from "@/components/csrf-input";
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
import {
  createBookingAction,
  type BookingFormState,
} from "@/lib/actions/booking";

const initialState: BookingFormState = {};

export function BookingDialog({
  room,
  requiresLogin,
}: {
  room: { id: string; roomNumber: string; roomType: string; pricePerSemester: number };
  requiresLogin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    createBookingAction,
    initialState,
  );

  if (requiresLogin) {
    return (
      <Button render={<a href="/login?next=/hostels" />} nativeButton={false} size="sm">
        Log in to book
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Request booking</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request this room</DialogTitle>
          <DialogDescription>
            Room {room.roomNumber} ({room.roomType}) · GH₵{" "}
            {room.pricePerSemester.toLocaleString()} per academic year. Your request
            goes to the hostel manager for approval - you only pay after it is approved.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
      <CsrfInput />
          <input type="hidden" name="roomId" value={room.id} />
          {state.error && (
            <p className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Submitting…" : "Submit request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

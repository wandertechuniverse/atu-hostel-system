"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CsrfInput } from "@/components/csrf-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const SESSION_OPTIONS = ["2026/2027", "2027/2028"];

export function BookingDialog({
  room,
  requiresLogin,
  hostelName,
}: {
  room: { id: string; roomNumber: string; roomType: string; pricePerSemester: number };
  requiresLogin: boolean;
  hostelName?: string;
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request this room</DialogTitle>
          <DialogDescription>
            {hostelName ? `${hostelName} · ` : ""}
            Room {room.roomNumber} ({room.roomType}) · GH₵{" "}
            {room.pricePerSemester.toLocaleString()} per academic year. Your request
            goes to the hostel manager for approval — you only pay after it is approved.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <CsrfInput />
          <input type="hidden" name="roomId" value={room.id} />

          {state.error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor={`session-${room.id}`}>Academic session</Label>
            <select
              id={`session-${room.id}`}
              name="academicSession"
              defaultValue="2026/2027"
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs"
            >
              {SESSION_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`notes-${room.id}`}>Notes (optional)</Label>
            <Input
              id={`notes-${room.id}`}
              name="notes"
              placeholder="e.g. preferred floor, roommate request"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              Visible to hostel staff when reviewing your request.
            </p>
          </div>

          <div className="rounded-md border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">Before you submit</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>This is a request, not a guaranteed bed until approved.</li>
              <li>Payment in this system is simulated (no real money).</li>
              <li>
                Read the{" "}
                <Link href="/disclaimer" className="text-primary underline-offset-4 hover:underline" target="_blank">
                  disclaimer
                </Link>
                ,{" "}
                <Link href="/privacy" className="text-primary underline-offset-4 hover:underline" target="_blank">
                  privacy notice
                </Link>
                , and{" "}
                <Link href="/prospectus" className="text-primary underline-offset-4 hover:underline" target="_blank">
                  sample prospectus
                </Link>
                .
              </li>
            </ul>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="acceptRules"
              value="on"
              required
              className="mt-1 size-4 rounded border"
            />
            <span>
              I accept the booking rules,{" "}
              <Link href="/disclaimer" className="text-primary underline-offset-4 hover:underline">
                disclaimer
              </Link>
              , and{" "}
              <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">
                privacy notice
              </Link>
              .
            </span>
          </label>

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

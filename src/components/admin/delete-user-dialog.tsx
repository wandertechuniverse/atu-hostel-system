"use client";

import { useActionState, useEffect, useState } from "react";
import { CsrfInput } from "@/components/csrf-input";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
  deleteUserAction,
  type UsersFormState,
} from "@/lib/actions/users";

const initial: UsersFormState = {};

/**
 * Hard-delete an account (completes the user lifecycle: create → edit →
 * activate/deactivate → delete). Disabled when the user has booking history -
 * those bookings and their payments reference the account, so the guard
 * requires deactivation instead. Your own row shows no button at all.
 * Confirmation is required inside the dialog.
 */
export function DeleteUserDialog({
  userId,
  name,
  bookingCount,
  isSelf,
}: {
  userId: string;
  name: string;
  bookingCount: number;
  isSelf: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    deleteUserAction,
    initial,
  );

  // Close after a successful delete (the action revalidates the page, so the
  // row disappears).
  useEffect(() => {
    if (state.ok) {
      toast.success("User deleted");
      setOpen(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  if (isSelf) return null;

  const guarded = bookingCount > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant="outline"
            disabled={guarded}
            title={
              guarded
                ? `Has ${bookingCount} booking${bookingCount === 1 ? "" : "s"} on record - deactivate instead to preserve history`
                : "Delete this account (admin only)"
            }
            className="w-full text-destructive hover:text-destructive"
          />
        }
      >
        <Trash2 />
        Delete
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {name}?</DialogTitle>
          <DialogDescription>
            This permanently removes the account and cannot be undone. The
            user&apos;s audit-log entries are kept but will no longer be
            attributed to them; if they manage a hostel, that hostel becomes
            managerless.
          </DialogDescription>
        </DialogHeader>

        {state.error && (
          <p
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {state.error}
          </p>
        )}

        <form action={formAction}>
      <CsrfInput />
          <input type="hidden" name="userId" value={userId} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Deleting…" : "Delete account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

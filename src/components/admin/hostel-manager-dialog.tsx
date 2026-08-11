"use client";

import { useActionState, useEffect, useState } from "react";
import { CsrfInput } from "@/components/csrf-input";
import { UserCog } from "lucide-react";
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
import {
  setHostelManagerAction,
  type HostelFormState,
} from "@/lib/actions/hostel";

const initial: HostelFormState = {};

export type ManagerCandidate = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export function HostelManagerDialog({
  hostelId,
  hostelName,
  currentManagerId,
  currentManagerName,
  candidates,
}: {
  hostelId: string;
  hostelName: string;
  currentManagerId: string | null;
  currentManagerName: string | null;
  candidates: ManagerCandidate[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    setHostelManagerAction,
    initial,
  );
  // Controlled so the submitted value is the admin's selection, not a stale DOM
  // value after revalidation (the parent keys this component on the manager).
  const [selected, setSelected] = useState(currentManagerId ?? "");

  useEffect(() => {
    if (state.ok) {
      toast.success(selected ? "Manager assigned" : "Manager cleared", {
        description: `${hostelName}'s manager was updated.`,
      });
      setOpen(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, selected, hostelName]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <UserCog className="size-3.5" />
        Manager
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hostel manager</DialogTitle>
          <DialogDescription>
            Choose who runs {hostelName}. The previous manager is automatically
            demoted back to student; one manager per hostel, always.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-3">
      <CsrfInput />
          <input type="hidden" name="hostelId" value={hostelId} />
          {state.error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.error}
            </p>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor={`manager-select-${hostelId}`}
              className="text-sm font-medium"
            >
              Manager
            </label>
            <select
              id={`manager-select-${hostelId}`}
              name="userId"
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              disabled={pending}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="">- No manager -</option>
              {candidates.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
            {currentManagerName && (
              <p className="text-xs text-muted-foreground">
                Currently: {currentManagerName}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save manager"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

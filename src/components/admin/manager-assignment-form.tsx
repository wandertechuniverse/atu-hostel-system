"use client";

import { useActionState, useEffect, useState } from "react";
import { CsrfInput } from "@/components/csrf-input";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  assignManagerAction,
  type UsersFormState,
} from "@/lib/actions/users";

const initial: UsersFormState = {};

export function ManagerAssignmentForm({
  userId,
  currentHostelId,
  hostels,
}: {
  userId: string;
  currentHostelId: string | null;
  hostels: { id: string; name: string; takenBy: string | null }[];
}) {
  const [state, formAction, pending] = useActionState(
    assignManagerAction,
    initial,
  );

  useEffect(() => {
    if (state.ok) toast.success("Hostel assignment saved");
    else if (state.error) toast.error(state.error);
  }, [state]);
  // Controlled so the user's selection is submitted with the form. The parent
  // keys this component on the assignment, so a saved change remounts it with
  // the fresh prop - the select never shows a stale value after revalidation.
  const [selected, setSelected] = useState(currentHostelId ?? "");

  return (
    <form action={formAction} className="flex w-full flex-col gap-1">
      <CsrfInput />
      <input type="hidden" name="userId" value={userId} />
      {state.error && (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <div className="flex w-full flex-wrap items-center gap-1.5">
        <select
          name="hostelId"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          disabled={pending}
          className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">- No hostel -</option>
          {hostels.map((hostel) => {
            const takenByOther =
              hostel.takenBy !== null && hostel.takenBy !== userId;
            return (
              <option key={hostel.id} value={hostel.id} disabled={takenByOther}>
                {hostel.name}
                {takenByOther ? " (assigned)" : ""}
              </option>
            );
          })}
        </select>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

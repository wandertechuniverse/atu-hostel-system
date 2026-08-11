"use client";

import { useActionState } from "react";
import { CsrfInput } from "@/components/csrf-input";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  deleteHostelAction,
  type HostelFormState,
} from "@/lib/actions/hostel";

const initial: HostelFormState = {};

export function DeleteHostelButton({ hostelId }: { hostelId: string }) {
  const [state, formAction, pending] = useActionState(
    deleteHostelAction,
    initial,
  );

  return (
    <form action={formAction}>
      <CsrfInput />
      <input type="hidden" name="hostelId" value={hostelId} />
      {state.error && (
        <p className="mt-1 text-right text-xs text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={pending}
        title="Delete this hostel (admin only)"
        className="text-destructive hover:text-destructive"
      >
        <Trash2 />
        Delete
      </Button>
    </form>
  );
}

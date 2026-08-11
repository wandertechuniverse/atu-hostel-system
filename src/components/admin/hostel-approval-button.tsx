"use client";

import { useActionState } from "react";
import { CsrfInput } from "@/components/csrf-input";
import { Button } from "@/components/ui/button";
import {
  toggleHostelApprovalFormAction,
  type AdminActionResult,
} from "@/lib/actions/admin";

const initial: AdminActionResult = { ok: true };

export function HostelApprovalButton({
  hostelId,
  isApproved,
}: {
  hostelId: string;
  isApproved: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    toggleHostelApprovalFormAction,
    initial,
  );

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <CsrfInput />
      <input type="hidden" name="hostelId" value={hostelId} />
      {state && "error" in state && state.error && (
        <p className="text-right text-xs text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Button
        type="submit"
        size="sm"
        variant={isApproved ? "outline" : "default"}
        disabled={pending}
      >
        {pending ? "Saving…" : isApproved ? "Unpublish" : "Publish"}
      </Button>
    </form>
  );
}

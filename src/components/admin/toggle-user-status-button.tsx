"use client";

import { useActionState } from "react";
import { CsrfInput } from "@/components/csrf-input";
import { Button } from "@/components/ui/button";
import {
  toggleUserStatusAction,
  type UsersFormState,
} from "@/lib/actions/users";

const initial: UsersFormState = {};

export function ToggleUserStatusButton({
  userId,
  isActive,
  isSelf,
}: {
  userId: string;
  isActive: boolean;
  isSelf: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    toggleUserStatusAction,
    initial,
  );

  if (isSelf) {
    return <span className="text-xs text-muted-foreground">You</span>;
  }

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <CsrfInput />
      <input type="hidden" name="userId" value={userId} />
      {state.error && (
        <p className="text-right text-xs text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Button
        type="submit"
        size="sm"
        variant={isActive ? "outline" : "default"}
        disabled={pending}
      >
        {pending ? "Saving…" : isActive ? "Deactivate" : "Activate"}
      </Button>
    </form>
  );
}

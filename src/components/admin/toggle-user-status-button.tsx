"use client";

import { useActionState, useEffect } from "react";
import { CsrfInput } from "@/components/csrf-input";
import { toast } from "sonner";
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

  useEffect(() => {
    if (state.ok) {
      toast.success(isActive ? "Account deactivated" : "Account activated");
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, isActive]);

  if (isSelf) {
    return <span className="text-xs text-muted-foreground">You</span>;
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-1">
      <CsrfInput />
      <input type="hidden" name="userId" value={userId} />
      {state.error && (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Button
        type="submit"
        size="sm"
        variant={isActive ? "outline" : "default"}
        disabled={pending}
        className="w-full"
      >
        {pending ? "Saving…" : isActive ? "Deactivate" : "Activate"}
      </Button>
    </form>
  );
}

"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { CsrfInput } from "@/components/csrf-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  resetPasswordAction,
  type ResetPasswordState,
} from "@/lib/actions/auth";

const initial: ResetPasswordState = {};

/**
 * Forgot-password step 2 - public. The token from the emailed link is a
 * hidden field; possession of an unexpired, single-use token is the proof of
 * identity (no current password asked). Success redirects to /login?reset=1;
 * a failed attempt keeps the typed values.
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<ResetPasswordState>(initial);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await resetPasswordAction(initial, formData);
      setState(result);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <CsrfInput />
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="reset-new-password">New password</Label>
        <PasswordInput
          id="reset-new-password"
          name="newPassword"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <p className="text-xs text-muted-foreground">
          At least 8 characters.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reset-confirm-password">Confirm new password</Label>
        <PasswordInput
          id="reset-confirm-password"
          name="confirmPassword"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Resetting…" : "Reset password"}
      </Button>
    </form>
  );
}

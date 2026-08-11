"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { CsrfInput } from "@/components/csrf-input";
import { CheckCircle2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  changePasswordAction,
  type ChangePasswordState,
} from "@/lib/actions/auth";

const initial: ChangePasswordState = {};

/**
 * Self-service password change (FR-9). The current password must be verified
 * before the new one is accepted; the confirm check also runs server-side,
 * never only in the client. Any signed-in role can use it.
 *
 * The action is dispatched imperatively (not via form action=) so a failed
 * submission does NOT wipe the fields - React's automatic form reset only
 * happens on success, matching the "fix the current password and resubmit"
 * flow.
 */
export function ChangePasswordForm() {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<ChangePasswordState>(initial);
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await changePasswordAction(initial, formData);
      setState(result);
      if (result.ok) formRef.current?.reset();
    });
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4 text-muted-foreground" />
          Change password
        </CardTitle>
        <CardDescription>
          Verify your current password, then set a new one. Your new password
          must be at least 8 characters.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state.ok && (
          <p className="mb-4 flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-4 shrink-0" />
            Password updated. Use the new password next time you log in.
          </p>
        )}
        {state.error && (
          <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}

        <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <CsrfInput />
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Current password</Label>
            <PasswordInput
              id="current-password"
              name="currentPassword"
              autoComplete="current-password"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <PasswordInput
              id="new-password"
              name="newPassword"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <PasswordInput
              id="confirm-password"
              name="confirmPassword"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Updating…" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

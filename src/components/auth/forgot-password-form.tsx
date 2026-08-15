"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { CsrfInput } from "@/components/csrf-input";
import { KeyRound, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  forgotPasswordAction,
  type ForgotPasswordState,
} from "@/lib/actions/auth";

const initial: ForgotPasswordState = {};

/**
 * Forgot-password step 1 - public. The success message is identical whether
 * or not the account exists (no user enumeration). In development the reset
 * link is shown below the form; in production it exists only in the email.
 * Dispatched imperatively so a failed submission (e.g. rate limit) does not
 * wipe the typed email.
 */
export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<ForgotPasswordState>(initial);
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await forgotPasswordAction(initial, formData);
      setState(result);
      if (result.ok) formRef.current?.reset();
    });
  }

  return (
    <div className="space-y-4">
      {state.ok ? (
        <div className="space-y-3">
          <p className="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
            <MailCheck className="mt-0.5 size-4 shrink-0" />
            If an account exists for that email, a reset link has been sent.
            It expires in 30 minutes and can only be used once.
          </p>
          {state.devResetUrl && (
            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">
                Development build - no email is sent. Your reset link:
              </p>
              <a
                href={state.devResetUrl}
                className="break-all font-mono text-primary underline underline-offset-4"
              >
                {state.devResetUrl}
              </a>
            </div>
          )}
        </div>
      ) : (
        <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <CsrfInput />
          {state.error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.error}
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@atu.edu.gh"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            <KeyRound className="size-4" />
            {pending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </div>
  );
}

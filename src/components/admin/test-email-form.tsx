"use client";

import { useActionState } from "react";
import { CsrfInput } from "@/components/csrf-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  sendTestEmailAction,
  verifyMailerAction,
  type NotificationFormState,
} from "@/lib/actions/notifications";

const initial: NotificationFormState = {};

export function TestEmailForm({ defaultTo }: { defaultTo: string }) {
  const [sendState, sendAction, sending] = useActionState(
    sendTestEmailAction,
    initial,
  );
  const [verifyState, verifyAction, verifying] = useActionState(
    verifyMailerAction,
    initial,
  );

  return (
    <div className="space-y-4">
      <form action={verifyAction} className="flex flex-wrap items-center gap-2">
        <CsrfInput />
        <Button type="submit" variant="outline" size="sm" disabled={verifying}>
          {verifying ? "Checking…" : "Verify connection"}
        </Button>
        {verifyState.verifyMessage && (
          <p
            className={`text-sm ${
              verifyState.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
            }`}
          >
            {verifyState.verifyMessage}
          </p>
        )}
        {verifyState.error && !verifyState.verifyMessage && (
          <p className="text-sm text-destructive">{verifyState.error}</p>
        )}
      </form>

      <form action={sendAction} className="space-y-3">
        <CsrfInput />
        {sendState.error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {sendState.error}
          </p>
        )}
        {sendState.ok && (
          <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            {sendState.status === "logged"
              ? "Test message written to the server log (console mailer)."
              : sendState.status === "skipped"
                ? "Outbound email is paused. Nothing was sent."
                : "Test email accepted by the mailer."}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="test-email-to">Send test email to</Label>
            <Input
              id="test-email-to"
              name="to"
              type="email"
              defaultValue={defaultTo}
              required
              autoComplete="email"
            />
          </div>
          <Button type="submit" disabled={sending}>
            {sending ? "Sending…" : "Send test"}
          </Button>
        </div>
      </form>
    </div>
  );
}

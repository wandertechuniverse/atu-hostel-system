"use client";

import { useActionState } from "react";
import { CsrfInput } from "@/components/csrf-input";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { loginAction, type AuthFormState } from "@/lib/actions/auth";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo-accounts";

const initialState: AuthFormState = {};

function fillDemo(email: string) {
  const emailEl = document.getElementById("email") as HTMLInputElement | null;
  const passEl = document.getElementById("password") as HTMLInputElement | null;
  if (emailEl) emailEl.value = email;
  if (passEl) passEl.value = DEMO_PASSWORD;
  passEl?.focus();
}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const invalid = Boolean(state.error);

  return (
    <form action={formAction} className="space-y-4" aria-busy={pending}>
      <CsrfInput />
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoFocus
          required
          aria-invalid={invalid}
          disabled={pending}
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            prefetch
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          aria-invalid={invalid}
          disabled={pending}
        />
      </div>
      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {pending ? "Logging in…" : "Log in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New student?{" "}
        <Link
          href="/register"
          prefetch
          className="text-primary underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>

      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">Demo accounts</p>
        <ul className="space-y-1">
          {DEMO_ACCOUNTS.map((row) => (
            <li key={row.email}>
              <button
                type="button"
                onClick={() => fillDemo(row.email)}
                className="w-full rounded-sm px-1 py-0.5 text-left transition-colors hover:bg-muted hover:text-foreground"
              >
                <span className="sr-only">Fill {row.hint} demo: </span>
                {row.email} / {DEMO_PASSWORD}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </form>
  );
}

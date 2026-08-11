"use client";

import { useActionState } from "react";
import { CsrfInput } from "@/components/csrf-input";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  loginAction,
  type AuthFormState,
} from "@/lib/actions/auth";

const initialState: AuthFormState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
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
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Forgot password?
        </Link>
      </div>
      {state.error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Logging in…" : "Log in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New student?{" "}
        <Link href="/register" className="text-primary underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </form>
  );
}

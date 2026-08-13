"use client";

import { useActionState } from "react";
import { CsrfInput } from "@/components/csrf-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateProfileAction,
  type ProfileFormState,
} from "@/lib/actions/auth";

const initial: ProfileFormState = {};

export function ProfileForm({
  user,
}: {
  user: {
    name: string;
    email: string;
    phone: string;
    department: string | null;
    studentIdNumber: string | null;
    role: string;
  };
}) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    initial,
  );
  const isStudent = user.role === "STUDENT";

  return (
    <form action={formAction} className="space-y-4">
      <CsrfInput />
      {state.ok && (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          Profile saved.
        </p>
      )}
      {state.error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" defaultValue={user.name} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          value={user.email}
          disabled
          readOnly
          className="opacity-70"
        />
        <p className="text-xs text-muted-foreground">
          Email cannot be changed here - contact an administrator if needed.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={user.phone}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="department">Department</Label>
        <Input
          id="department"
          name="department"
          defaultValue={user.department ?? ""}
          placeholder="e.g. Information Technology"
        />
      </div>
      {isStudent && (
        <div className="space-y-1.5">
          <Label htmlFor="studentIdNumber">Student ID</Label>
          <Input
            id="studentIdNumber"
            name="studentIdNumber"
            defaultValue={user.studentIdNumber ?? ""}
            placeholder="e.g. 01240233C"
          />
        </div>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

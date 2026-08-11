"use client";

import { useActionState, useEffect, useState } from "react";
import { CsrfInput } from "@/components/csrf-input";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { createUserAction, type UsersFormState } from "@/lib/actions/users";

const initial: UsersFormState = {};

/**
 * Admin-created accounts (PRD story A4). Students self-register; staff
 * accounts - manager and sub-admin - are always created here by an
 * administrator, because the role can never be self-asserted. A manager
 * created this way has no hostel until one is assigned on the Users page.
 *
 * Uses a native <select> for role (not Base UI Select) so the dialog never
 * crashes on open if the headless select portal misbehaves in production.
 */
export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    createUserAction,
    initial,
  );

  // Close after a successful save (the action revalidates the page).
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <UserPlus className="size-4" />
        Add user
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>
            Create a student, manager, or sub-admin account. Share the password
            with the user securely — they can change it later under Profile /
            Change password.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <CsrfInput />
          {state.error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="new-name">Full name</Label>
            <Input
              id="new-name"
              name="name"
              placeholder="e.g. Efua Ama"
              autoComplete="off"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-email">Email</Label>
            <Input
              id="new-email"
              name="email"
              type="email"
              placeholder="e.g. efua@atu.edu.gh"
              autoComplete="off"
              autoCapitalize="none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-student-id">Student ID (optional)</Label>
              <Input
                id="new-student-id"
                name="studentIdNumber"
                placeholder="e.g. 01240233C"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-phone">Phone</Label>
              <Input
                id="new-phone"
                name="phone"
                type="tel"
                placeholder="e.g. 0550000000"
                autoComplete="off"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-role">Role</Label>
            <select
              id="new-role"
              name="role"
              defaultValue="STUDENT"
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs"
            >
              <option value="STUDENT">Student</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Sub-admin</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-password">Password</Label>
            <PasswordInput
              id="new-password"
              name="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <p className="text-xs text-muted-foreground">
              At least 8 characters. Give it to the user securely.
            </p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

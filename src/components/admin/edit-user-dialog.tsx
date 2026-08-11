"use client";

import { useActionState, useEffect, useState } from "react";
import { CsrfInput } from "@/components/csrf-input";
import { Pencil } from "lucide-react";
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
import { updateUserAction, type UsersFormState } from "@/lib/actions/users";

const initial: UsersFormState = {};

export type UserDraft = {
  id: string;
  name: string;
  email: string;
  phone: string;
  studentIdNumber: string | null;
  department: string | null;
};

export function EditUserDialog({ user }: { user: UserDraft }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateUserAction,
    initial,
  );

  // Close after a successful save (the parent keys this component on the
  // user's updatedAt, so the remount picks up the fresh values).
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="sm" variant="outline" className="w-full" />}
      >
        <Pencil className="size-3.5" />
        Edit
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Update {user.name}&apos;s profile, or reset their password. Leave
            the password blank to keep the current one.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
      <CsrfInput />
          <input type="hidden" name="userId" value={user.id} />
          {state.error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Full name</Label>
            <Input
              id="edit-name"
              name="name"
              defaultValue={user.name}
              autoComplete="off"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              name="email"
              type="email"
              defaultValue={user.email}
              autoComplete="off"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-student-id">Student ID</Label>
            <Input
              id="edit-student-id"
              name="studentIdNumber"
              defaultValue={user.studentIdNumber ?? ""}
              placeholder="e.g. 01240233C"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input
              id="edit-phone"
              name="phone"
              type="tel"
              defaultValue={user.phone}
              autoComplete="off"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-department">Department (optional)</Label>
            <Input
              id="edit-department"
              name="department"
              defaultValue={user.department ?? ""}
              placeholder="e.g. Computer Engineering"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5 rounded-md border border-dashed px-3 py-3">
            <Label htmlFor="edit-password">Reset password</Label>
            <PasswordInput
              id="edit-password"
              name="password"
              placeholder="Leave blank to keep current"
              autoComplete="new-password"
              minLength={8}
            />
            <p className="text-xs text-muted-foreground">
              At least 8 characters. The new password applies immediately.
            </p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

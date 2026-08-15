"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  User,
  UserCircle,
} from "lucide-react";
import { CsrfInput } from "@/components/csrf-input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { logoutAction } from "@/lib/actions/auth";
import { homeForRole } from "@/lib/paths";
import { STUDENT_BOOKINGS, STUDENT_PROFILE } from "@/lib/paths";

export function StudentNavMenu({
  role,
}: {
  role?: "STUDENT" | "MANAGER" | "ADMIN";
}) {
  const [open, setOpen] = useState(false);

  const itemClass =
    "flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted";

  return (
    <div className="md:hidden">
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Open menu"
          />
        }
      >
        <Menu className="size-4" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-3 pb-4">
          <Link
            href="/"
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            <Building2 className="size-4" />
            Hostels
          </Link>
          {role && role !== "STUDENT" && (
            <Link
              href={homeForRole(role)}
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              <LayoutDashboard className="size-4" />
              Dashboard
            </Link>
          )}
          <Link
            href={STUDENT_BOOKINGS}
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            <User className="size-4" />
            My bookings
          </Link>
          <Link
            href={STUDENT_PROFILE}
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            <UserCircle className="size-4" />
            Profile
          </Link>
          <Link
            href="/change-password"
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            <KeyRound className="size-4" />
            Change password
          </Link>
          <form action={logoutAction}>
            <CsrfInput />
            <button type="submit" className={`${itemClass} w-full text-left`}>
              <LogOut className="size-4" />
              Log out
            </button>
          </form>
        </nav>
      </SheetContent>
    </Sheet>
    </div>
  );
}

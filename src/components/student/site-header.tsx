import Link from "next/link";
import {
  Building2,
  KeyRound,
  LayoutDashboard,
  LogOut,
  User,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationMenu } from "@/components/notifications/notification-menu";
import { StudentNavMenu } from "@/components/student/student-nav-menu";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";
import { CsrfInput } from "@/components/csrf-input";
import {
  homeForRole,
  STUDENT_BOOKINGS,
  STUDENT_PROFILE,
} from "@/lib/paths";

export async function SiteHeader() {
  const session = await getSession();
  const loggedIn = session.isLoggedIn === true && !!session.userId;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Building2 className="size-5 shrink-0" />
          <span className="truncate">
            ATU{" "}
            <span className="sr-only text-muted-foreground sm:not-sr-only">
              Hostel Booking
            </span>
          </span>
        </Link>

        {/* Labels collapse to icons below sm so the logged-in nav fits
            on narrow phones (the header was overflowing at 320px).
            sr-only keeps the accessible names for screen readers. */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {loggedIn && session.role !== "STUDENT" && (
            <Button
              render={<Link href={homeForRole(session.role)} />}
              nativeButton={false}
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex"
            >
              <LayoutDashboard className="size-4" />
              <span>Dashboard</span>
            </Button>
          )}
          {loggedIn && (
            <Button
              render={<Link href={STUDENT_BOOKINGS} />}
              nativeButton={false}
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex"
            >
              <User className="size-4" />
              <span>My bookings</span>
            </Button>
          )}
          {loggedIn && (
            <Button
              render={<Link href={STUDENT_PROFILE} />}
              nativeButton={false}
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex"
            >
              <UserCircle className="size-4" />
              <span>Profile</span>
            </Button>
          )}
          {loggedIn && (
            <Button
              render={<Link href="/change-password" aria-label="Change password" />}
              nativeButton={false}
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex"
            >
              <KeyRound className="size-4" />
              <span aria-hidden>Password</span>
            </Button>
          )}
          {loggedIn && session.userId && session.role && (
            <NotificationMenu userId={session.userId} role={session.role} />
          )}
          {loggedIn ? (
            <form action={logoutAction} className="hidden md:block">
              <CsrfInput />
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="size-4" />
                <span>Log out</span>
              </Button>
            </form>
          ) : (
            <Button render={<Link href="/login" />} nativeButton={false} size="sm">
              Log in
            </Button>
          )}
          <ThemeToggle />
          {loggedIn && <StudentNavMenu role={session.role} />}
        </nav>
      </div>
    </header>
  );
}

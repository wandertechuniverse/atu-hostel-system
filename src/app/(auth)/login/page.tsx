import type { Metadata } from "next";
import { redirect, unstable_rethrow } from "next/navigation";
import { db } from "@/lib/db";
import { getSession, homeForRole } from "@/lib/auth";
import { formatDbError, withDbRetry } from "@/lib/db-errors";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Log in",
  description:
    "Sign in to the ATU hostel booking system as a student, hostel manager or administrator.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; error?: string }>;
}) {
  const sp = await searchParams;
  let session: { isLoggedIn?: boolean; userId?: string };
  try {
    session = await getSession();
  } catch (error) {
    // Cookie / iron-session failures must not blank the public login form.
    unstable_rethrow(error);
    console.error("[login] getSession failed:", formatDbError(error));
    session = { isLoggedIn: false };
  }
  // Redirect only when the session's account still exists and is active. A stale
  // cookie (user reseeded/deleted) otherwise loops: /login -> /admin -> /login.
  if (session.isLoggedIn && session.userId) {
    try {
      const user = await withDbRetry("login.sessionUser", () =>
        db.user.findUnique({
          where: { id: session.userId! },
          select: { id: true, isActive: true, role: true },
        }),
      );
      if (user && user.isActive) {
        redirect(homeForRole(user.role));
      }
    } catch (error) {
      // redirect() throws NEXT_REDIRECT — must not be treated as a DB failure.
      unstable_rethrow(error);
      // Stay on login rather than 500 when Neon is briefly unreachable.
      console.error("[login] session check failed:", formatDbError(error));
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Log in</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        Students, hostel managers and administrators all sign in here.
      </p>
      {sp.reset === "1" && (
        <p
          role="status"
          className="mb-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400"
        >
          Password reset. Log in with your new password.
        </p>
      )}
      {sp.error === "db" && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200"
        >
          Could not reach the database. If you use local Postgres, run{" "}
          <code className="rounded bg-background/60 px-1">bun run db:local</code>{" "}
          then refresh. On Neon, wait a few seconds for free compute to wake.
        </p>
      )}
      <LoginForm />
    </>
  );
}

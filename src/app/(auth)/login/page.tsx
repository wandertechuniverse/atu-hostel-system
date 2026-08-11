import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession, homeForRole } from "@/lib/auth";
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
  searchParams: Promise<{ reset?: string }>;
}) {
  const session = await getSession();
  // Redirect only when the session's account still exists and is active. A stale
  // cookie (user reseeded/deleted) otherwise loops: /login -> /admin -> /login.
  if (session.isLoggedIn && session.userId) {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { id: true, isActive: true, role: true },
    });
    if (user && user.isActive) {
      redirect(homeForRole(user.role));
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Log in</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        Students, hostel managers and administrators all sign in here.
      </p>
      {(await searchParams).reset === "1" && (
        <p className="mb-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
          Password reset. Log in with your new password.
        </p>
      )}
      <LoginForm />
      <div className="mt-8 rounded-md border border-dashed p-4 text-xs text-muted-foreground">
        <p className="mb-1 font-medium text-foreground">Demo accounts</p>
        <p>student@atu.edu.gh / password</p>
        <p>manager@hostel.test / password</p>
        <p>admin@atu.edu.gh / password</p>
      </div>
    </>
  );
}

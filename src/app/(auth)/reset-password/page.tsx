import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Set a new password with your one-time reset link.",
  alternates: { canonical: "/reset-password" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token?.trim() ?? "";

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Reset password</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        Choose a new password for your account.
      </p>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="space-y-3">
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            This reset link is missing its token. Request a fresh link and use
            it in full.
          </p>
          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/forgot-password"
              className="text-primary underline underline-offset-4"
            >
              Request a new reset link
            </Link>
          </p>
        </div>
      )}
    </>
  );
}

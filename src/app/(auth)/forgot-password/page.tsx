import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
  description:
    "Request a password reset link for your ATU Hostel Booking account.",
  alternates: { canonical: "/forgot-password" },
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Forgot password</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        Enter the email on your account. If it exists, we&apos;ll send a
        one-time reset link that expires in 30 minutes.
      </p>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="text-primary underline underline-offset-4">
          Back to log in
        </Link>
      </p>
    </>
  );
}

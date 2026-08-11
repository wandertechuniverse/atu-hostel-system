import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export const metadata: Metadata = {
  title: "Change password",
  description:
    "Verify your current password and set a new one for your ATU Hostel Booking account.",
};

export const dynamic = "force-dynamic";

/** Self-service password change (FR-9) - any signed-in role. */
export default async function ChangePasswordPage() {
  await requireRole("STUDENT", "MANAGER", "ADMIN");

  return (
    <div className="flex flex-1 flex-col justify-center px-4 py-10">
      <ChangePasswordForm />
    </div>
  );
}

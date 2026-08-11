"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { clientIp } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { errorMessage } from "@/lib/services/errors";
import {
  changeOwnPassword,
  loginUser,
  logoutUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
} from "@/lib/services/auth";

export type AuthFormState = { error?: string };

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  try {
    await requireCsrf(formData);
    await registerUser({
      name: formData.get("name"),
      email: formData.get("email"),
      studentIdNumber: formData.get("studentIdNumber"),
      phone: formData.get("phone"),
      password: formData.get("password"),
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }
  redirect("/");
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  try {
    await requireCsrf(formData);
    const { home } = await loginUser(
      { email: formData.get("email"), password: formData.get("password") },
      await clientIp(),
    );
    redirect(home);
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function logoutAction(formData: FormData) {
  await requireCsrf(formData);
  await logoutUser();
  redirect("/login");
}

/** Server-computed origin for emailed links (never trusted from the client). */
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export type ForgotPasswordState = {
  ok?: boolean;
  error?: string;
  devResetUrl?: string;
};

/**
 * Forgot-password step 1 - public. The message is identical whether or not
 * the account exists (no user enumeration). In development the reset link is
 * returned for display; in production it exists only in the (console) mail.
 */
export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  try {
    await requireCsrf(formData);
    const result = await requestPasswordReset(
      { email: formData.get("email") },
      await clientIp(),
      await requestOrigin(),
    );
    return { ok: true, devResetUrl: result.devResetUrl };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export type ResetPasswordState = { ok?: boolean; error?: string };

/**
 * Forgot-password step 2 - public. Redeems the single-use token; on success
 * the user is sent to /login?reset=1 where the form explains the new
 * password is active.
 */
export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  try {
    await requireCsrf(formData);
    await resetPassword(
      {
        token: formData.get("token"),
        newPassword: formData.get("newPassword"),
        confirmPassword: formData.get("confirmPassword"),
      },
      await clientIp(),
    );
  } catch (error) {
    return { error: errorMessage(error) };
  }
  redirect("/login?reset=1");
}

export type ChangePasswordState = { ok?: boolean; error?: string };

/**
 * Self-service password change (FR-9) - any signed-in role. The current
 * password is verified server-side before the new one is accepted; the
 * confirm field is checked in the service (never only in the client).
 * Stays on the page: the form shows success/failure inline.
 */
export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  try {
    await requireCsrf(formData);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  const session = await requireRole("STUDENT", "MANAGER", "ADMIN");
  try {
    await changeOwnPassword(session, {
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { requireRole, requireSession } from "@/lib/auth";
import { homeForRole } from "@/lib/paths";
import { requireCsrf } from "@/lib/csrf";
import { errorMessage } from "@/lib/services/errors";
import {
  markAllNotificationsRead,
  markNotificationRead,
  probeMailer,
  sendAdminTestEmail,
} from "@/lib/services/notifications";
import type { MailerDelivery } from "@/lib/email-templates";

export type NotificationFormState = {
  ok?: boolean;
  error?: string;
  status?: MailerDelivery;
  verifyMessage?: string;
};

async function guardCsrf(
  formData: FormData,
): Promise<NotificationFormState | null> {
  try {
    await requireCsrf(formData);
    return null;
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

function refreshNotificationViews() {
  revalidatePath("/admin/notifications");
  revalidatePath("/admin");
  revalidatePath("/manager");
  revalidatePath("/");
}

export async function sendTestEmailAction(
  _prev: NotificationFormState,
  formData: FormData,
): Promise<NotificationFormState> {
  const csrf = await guardCsrf(formData);
  if (csrf) return csrf;
  const session = await requireRole("ADMIN");
  try {
    const status = await sendAdminTestEmail(session.userId!, {
      to: formData.get("to"),
    });
    refreshNotificationViews();
    if (status === "failed") {
      return {
        ok: false,
        status,
        error: "Could not deliver the test email. Check SMTP settings.",
      };
    }
    return { ok: true, status };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function verifyMailerAction(
  _prev: NotificationFormState,
  formData: FormData,
): Promise<NotificationFormState> {
  const csrf = await guardCsrf(formData);
  if (csrf) return csrf;
  await requireRole("ADMIN");
  const result = await probeMailer();
  return {
    ok: result.ok,
    error: result.ok ? undefined : result.message,
    verifyMessage: result.message,
  };
}

export async function openNotificationAction(formData: FormData) {
  await requireCsrf(formData);
  const session = await requireSession();
  const href = await markNotificationRead(
    session.userId!,
    String(formData.get("id") ?? ""),
  );
  refreshNotificationViews();
  redirect(href || homeForRole(session.role));
}

export async function markAllReadAction(formData: FormData) {
  try {
    await requireCsrf(formData);
    const session = await requireSession();
    await markAllNotificationsRead(session.userId!);
    refreshNotificationViews();
  } catch (error) {
    // requireSession uses redirect() on auth/DB failure (throws NEXT_REDIRECT).
    unstable_rethrow(error);
    // Soft-fail the bell action so a Neon blip never 500s the whole page.
    console.error("[notifications] markAllReadAction failed:", error);
  }
}

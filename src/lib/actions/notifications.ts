"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, requireSession } from "@/lib/auth";
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
  redirect(href || (session.role === "STUDENT" ? "/" : "/admin"));
}

export async function markAllReadAction(formData: FormData) {
  await requireCsrf(formData);
  const session = await requireSession();
  await markAllNotificationsRead(session.userId!);
  refreshNotificationViews();
}

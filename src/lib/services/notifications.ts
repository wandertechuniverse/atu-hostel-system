import "server-only";

import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import {
  describeMailer,
  NOTIFICATION_EVENTS,
  type MailerDelivery,
} from "@/lib/email-templates";
import { sendTestEmail, verifyMailer } from "@/lib/mailer";
import { notFoundError, validationError } from "@/lib/services/errors";
import { testEmailSchema } from "@/lib/validation";
import type { InboxItem } from "@/lib/notification-types";

export type { InboxItem };
export { describeMailer, NOTIFICATION_EVENTS };

export async function listMyNotifications(
  userId: string,
  take = 8,
): Promise<{ items: InboxItem[]; unreadCount: number }> {
  // One round-trip even when the inbox is empty (counts CTE + left join).
  type Row = {
    unreadCount: number;
    id: string | null;
    type: string | null;
    title: string | null;
    body: string | null;
    href: string | null;
    emailTo: string | null;
    delivery: string | null;
    readAt: Date | null;
    createdAt: Date | null;
  };

  const rows = await db.$queryRaw<Row[]>`
    WITH counts AS (
      SELECT count(*) FILTER (WHERE "readAt" IS NULL)::int AS "unreadCount"
      FROM "Notification"
      WHERE "userId" = ${userId}
    ),
    items AS (
      SELECT
        id,
        type,
        title,
        body,
        href,
        "emailTo" AS "emailTo",
        delivery,
        "readAt" AS "readAt",
        "createdAt" AS "createdAt"
      FROM "Notification"
      WHERE "userId" = ${userId}
      ORDER BY "createdAt" DESC
      LIMIT ${take}
    )
    SELECT c."unreadCount", i.*
    FROM counts c
    LEFT JOIN items i ON true
  `;

  const unreadCount = rows[0]?.unreadCount ?? 0;
  const items: InboxItem[] = rows
    .filter((r): r is Row & { id: string } => r.id != null)
    .map((r) => ({
      id: r.id,
      type: r.type ?? "",
      title: r.title ?? "",
      body: r.body ?? "",
      href: r.href,
      emailTo: r.emailTo,
      delivery: r.delivery ?? "logged",
      readAt: r.readAt,
      createdAt: r.createdAt ?? new Date(0),
    }));
  return { items, unreadCount };
}

export async function markNotificationRead(userId: string, id: string) {
  const row = await db.notification.findFirst({
    where: { id, userId },
    select: { id: true, href: true, readAt: true },
  });
  if (!row) throw notFoundError("Notification not found.");
  if (!row.readAt) {
    await db.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }
  return row.href;
}

export async function markAllNotificationsRead(userId: string) {
  await db.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function listRecentDeliveries(take = 40) {
  return db.notification.findMany({
    include: {
      user: { select: { name: true, email: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function notificationStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [total, unread, failed, today] = await Promise.all([
    db.notification.count(),
    db.notification.count({ where: { readAt: null } }),
    db.notification.count({ where: { delivery: "failed" } }),
    db.notification.count({ where: { createdAt: { gte: startOfToday } } }),
  ]);
  return { total, unread, failed, today };
}

/**
 * Send a test message through the configured mailer and drop a row in the
 * actor's inbox so the panel can confirm delivery without a real mailbox.
 */
export async function sendAdminTestEmail(
  actorId: string,
  input: { to: unknown },
): Promise<MailerDelivery> {
  const parsed = testEmailSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(
      parsed.error.issues[0]?.message ?? "Enter a valid email.",
    );
  }
  const to = parsed.data.to.toLowerCase();
  const status = await sendTestEmail(to);

  try {
    await db.notification.create({
      data: {
        userId: actorId,
        type: "email.test",
        title:
          status === "failed"
            ? "Test email failed"
            : status === "skipped"
              ? "Test email skipped"
              : "Test email sent",
        body: `Test message to ${to} (${status}).`,
        href: "/admin/notifications",
        emailTo: to,
        delivery: status,
      },
    });
  } catch (err) {
    console.error("[notifications] could not record test email:", err);
  }

  await audit({
    action: status === "failed" ? "email.test_failed" : "email.test_sent",
    userId: actorId,
    subjectType: "User",
    subjectId: actorId,
  });

  return status;
}

export async function probeMailer() {
  return verifyMailer();
}

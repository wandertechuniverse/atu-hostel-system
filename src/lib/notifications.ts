import "server-only";

import { db } from "@/lib/db";
import {
  bookingApprovedStudentEmail,
  bookingCreatedStaffEmail,
  bookingReceivedStudentEmail,
  bookingRejectedStudentEmail,
  emailNotificationsEnabled,
  paymentSubmittedStaffEmail,
  paymentVerifiedStudentEmail,
  resolveMailerMode,
  siteBase,
  type BookingNotifyContext,
  type EmailMessage,
  type MailerDelivery,
} from "@/lib/email-templates";
import { mailerFor, type Mailer } from "@/lib/mailer";
import {
  mailtrapApiReady,
  mailtrapTemplateUuid,
  sendMailtrapTemplate,
} from "@/lib/mailtrap-api";

/**
 * Transactional email notifications for booking / payment lifecycle events.
 * Failures are logged and never rethrown so a downed SMTP never blocks the
 * core booking flow.
 */

export type { BookingNotifyContext };

async function loadBookingContext(
  bookingId: string,
): Promise<BookingNotifyContext | null> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: { select: { name: true, email: true } },
      payment: { select: { reference: true } },
      room: {
        select: {
          roomNumber: true,
          roomType: true,
          hostel: {
            select: {
              name: true,
              manager: { select: { name: true, email: true, isActive: true } },
            },
          },
        },
      },
    },
  });
  if (!booking) return null;

  // When there is no hostel manager, copy admins so staff still get the alert.
  const hasManager =
    booking.room.hostel.manager?.isActive &&
    booking.room.hostel.manager.email;
  const admins = hasManager
    ? []
    : (
        await db.user.findMany({
          where: { role: "ADMIN", isActive: true },
          select: { email: true },
          take: 10,
        })
      ).map((a) => a.email);

  return {
    studentName: booking.user.name,
    studentEmail: booking.user.email,
    hostelName: booking.room.hostel.name,
    roomNumber: booking.room.roomNumber,
    roomType: booking.room.roomType,
    academicSession: booking.academicSession,
    amount: booking.amount,
    status: booking.status,
    paymentReference: booking.payment?.reference ?? null,
    managerEmail: hasManager ? booking.room.hostel.manager!.email : null,
    managerName: hasManager ? booking.room.hostel.manager!.name : null,
    adminEmails: admins,
    siteUrl: siteBase(),
  };
}

function recipientList(to: string | string[]): string[] {
  return (Array.isArray(to) ? to : [to])
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Best-effort in-app inbox rows for accounts that match the email recipients. */
export async function fanOutInApp(opts: {
  emails: string[];
  type: string;
  title: string;
  body: string;
  href?: string | null;
  delivery: MailerDelivery;
}): Promise<void> {
  const emails = [...new Set(recipientList(opts.emails))];
  if (emails.length === 0) return;
  try {
    const users = await db.user.findMany({
      where: { email: { in: emails }, isActive: true },
      select: { id: true, email: true },
    });
    if (users.length === 0) return;
    await db.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        type: opts.type,
        title: opts.title,
        body: opts.body,
        href: opts.href ?? null,
        emailTo: user.email,
        delivery: opts.delivery,
      })),
    });
  } catch (err) {
    console.error("[notifications] in-app fan-out failed:", err);
  }
}

/**
 * Send the email (unless outbound is paused) and mirror it into the in-app
 * inbox. Never throws - email outages must not break booking mutations.
 */
export async function deliver(
  message: EmailMessage,
  inbox: {
    type: string;
    title: string;
    body: string;
    href?: string | null;
  },
  mailer: Mailer = mailerFor(),
  env: NodeJS.ProcessEnv = process.env,
): Promise<MailerDelivery> {
  const to = recipientList(message.to);
  if (to.length === 0) return "skipped";

  let delivery: MailerDelivery;
  if (!emailNotificationsEnabled(env)) {
    delivery = "skipped";
  } else {
    try {
      const templateUuid = mailtrapTemplateUuid(inbox.type, env);
      if (templateUuid && mailtrapApiReady(env)) {
        await sendMailtrapTemplate(
          {
            to,
            templateUuid,
            variables: message.templateVariables,
          },
          env,
        );
        delivery = "sent";
      } else {
        await mailer.send(message);
        delivery = resolveMailerMode(env) === "smtp" ? "sent" : "logged";
      }
    } catch (err) {
      delivery = "failed";
      console.error("[notifications] send failed:", message.subject, err);
    }
  }

  await fanOutInApp({ emails: to, delivery, ...inbox });
  return delivery;
}

/** Never throw - email outages must not break booking mutations. */
export async function safeSend(
  message: EmailMessage,
  mailer: Mailer = mailerFor(),
): Promise<void> {
  await deliver(
    message,
    {
      type: "email.generic",
      title: message.subject,
      body: message.text.slice(0, 280),
    },
    mailer,
  );
}

export async function notifyBookingCreated(
  bookingId: string,
  mailer?: Mailer,
): Promise<void> {
  const ctx = await loadBookingContext(bookingId);
  if (!ctx) return;
  await deliver(
    bookingReceivedStudentEmail(ctx),
    {
      type: "booking.received.student",
      title: `Booking request received - ${ctx.hostelName}`,
      body: `Room ${ctx.roomNumber} (${ctx.roomType}) is pending review.`,
      href: "/student/bookings",
    },
    mailer,
  );
  await deliver(
    bookingCreatedStaffEmail(ctx),
    {
      type: "booking.created.staff",
      title: `New booking - ${ctx.hostelName} ${ctx.roomNumber}`,
      body: `${ctx.studentName} requested room ${ctx.roomNumber}.`,
      href: "/admin/bookings",
    },
    mailer,
  );
}

export async function notifyBookingApproved(
  bookingId: string,
  mailer?: Mailer,
): Promise<void> {
  const ctx = await loadBookingContext(bookingId);
  if (!ctx) return;
  await deliver(
    bookingApprovedStudentEmail(ctx),
    {
      type: "booking.approved.student",
      title: `Booking approved - ${ctx.hostelName}`,
      body: `Room ${ctx.roomNumber} is confirmed. You can submit payment.`,
      href: "/student/bookings",
    },
    mailer,
  );
}

export async function notifyBookingRejected(
  bookingId: string,
  mailer?: Mailer,
): Promise<void> {
  const ctx = await loadBookingContext(bookingId);
  if (!ctx) return;
  await deliver(
    bookingRejectedStudentEmail(ctx),
    {
      type: "booking.rejected.student",
      title: `Booking not approved - ${ctx.hostelName}`,
      body: `Your request for room ${ctx.roomNumber} was not approved.`,
      href: "/student/bookings",
    },
    mailer,
  );
}

export async function notifyPaymentSubmitted(
  bookingId: string,
  mailer?: Mailer,
): Promise<void> {
  const ctx = await loadBookingContext(bookingId);
  if (!ctx) return;
  await deliver(
    paymentSubmittedStaffEmail(ctx),
    {
      type: "payment.submitted.staff",
      title: `Payment submitted - ${ctx.studentName}`,
      body: `${ctx.studentName} submitted payment for ${ctx.hostelName} room ${ctx.roomNumber}.`,
      href: "/admin/payments",
    },
    mailer,
  );
}

export async function notifyPaymentVerified(
  bookingId: string,
  mailer?: Mailer,
): Promise<void> {
  const ctx = await loadBookingContext(bookingId);
  if (!ctx) return;
  await deliver(
    paymentVerifiedStudentEmail(ctx),
    {
      type: "payment.verified.student",
      title: `Payment verified - ${ctx.hostelName}`,
      body: `Your payment for room ${ctx.roomNumber} has been verified.`,
      href: "/student/bookings",
    },
    mailer,
  );
}

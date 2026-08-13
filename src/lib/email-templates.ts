/**
 * Pure email builders (no I/O). Safe for unit tests and shared by the
 * notifications service.
 */

export type BookingNotifyContext = {
  studentName: string;
  studentEmail: string;
  hostelName: string;
  roomNumber: string;
  roomType: string;
  academicSession: string;
  amount: number;
  status: string;
  paymentReference?: string | null;
  managerEmail?: string | null;
  managerName?: string | null;
  adminEmails?: string[];
  siteUrl?: string;
};

export type TemplateVariables = Record<
  string,
  string | number | boolean | null
>;

export type EmailMessage = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  /** Handlebars vars for a Mailtrap-hosted template ({{studentName}}, …). */
  templateVariables?: TemplateVariables;
};

export const MAILTRAP_TEMPLATE_ENV: Record<string, string> = {
  "booking.received.student": "MAILTRAP_TEMPLATE_BOOKING_RECEIVED",
  "booking.created.staff": "MAILTRAP_TEMPLATE_BOOKING_CREATED_STAFF",
  "booking.approved.student": "MAILTRAP_TEMPLATE_BOOKING_APPROVED",
  "booking.rejected.student": "MAILTRAP_TEMPLATE_BOOKING_REJECTED",
  "payment.submitted.staff": "MAILTRAP_TEMPLATE_PAYMENT_SUBMITTED",
  "payment.verified.student": "MAILTRAP_TEMPLATE_PAYMENT_VERIFIED",
  "auth.password_reset": "MAILTRAP_TEMPLATE_PASSWORD_RESET",
  "email.test": "MAILTRAP_TEMPLATE_TEST",
};

export function mailtrapTemplateUuid(
  event: string,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string | null {
  const key = MAILTRAP_TEMPLATE_ENV[event];
  if (!key) return null;
  return env[key]?.trim() || null;
}

export function bookingTemplateVariables(
  ctx: BookingNotifyContext,
): TemplateVariables {
  const origin = ctx.siteUrl ?? siteBase();
  return {
    studentName: ctx.studentName,
    studentEmail: ctx.studentEmail,
    hostelName: ctx.hostelName,
    roomNumber: ctx.roomNumber,
    roomType: ctx.roomType,
    academicSession: ctx.academicSession,
    amount: ctx.amount,
    amountFormatted: ghs(ctx.amount),
    status: ctx.status,
    paymentReference: ctx.paymentReference ?? "",
    managerName: ctx.managerName ?? "",
    siteUrl: origin,
    myBookingsUrl: `${origin}/my-bookings`,
    adminBookingsUrl: `${origin}/admin/bookings`,
    adminPaymentsUrl: `${origin}/admin/payments`,
  };
}

export type MailtrapStatus = {
  apiConfigured: boolean;
  inboxId: string | null;
  endpoint: "sandbox" | "sending" | null;
  templates: { event: string; envKey: string; uuid: string | null }[];
};

/** Safe snapshot of Mailtrap template bindings. Never includes the API token. */
export function describeMailtrap(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): MailtrapStatus {
  const token = Boolean(env.MAILTRAP_API_TOKEN?.trim());
  const inboxId = env.MAILTRAP_INBOX_ID?.trim() || null;
  return {
    apiConfigured: token,
    inboxId,
    endpoint: token ? (inboxId ? "sandbox" : "sending") : null,
    templates: Object.entries(MAILTRAP_TEMPLATE_ENV).map(([event, envKey]) => ({
      event,
      envKey,
      uuid: env[envKey]?.trim() || null,
    })),
  };
}

const ghs = (n: number) => `GH₵ ${n.toLocaleString()}`;

export function siteBase(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string {
  return (
    env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000"
  );
}

function wrapHtml(title: string, body: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <h2 style="margin:0 0 12px;font-size:18px">${title}</h2>
      ${body}
      <p style="margin-top:24px;font-size:12px;color:#666">
        ATU Hostel Booking Management System
      </p>
    </div>
  `.trim();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function passwordResetEmail(to: string, url: string): EmailMessage {
  return {
    templateVariables: { email: to, resetUrl: url },
    to,
    subject: "Reset your ATU Hostel Booking password",
    text: [
      "You requested a password reset for your ATU Hostel Booking account.",
      "",
      "Open this link to choose a new password (expires in 1 hour):",
      url,
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <p>You requested a password reset for your ATU Hostel Booking account.</p>
      <p><a href="${url}">Choose a new password</a> (link expires in 1 hour).</p>
      <p>If you did not request this, you can ignore this email.</p>
    `.trim(),
  };
}

export function bookingReceivedStudentEmail(
  ctx: BookingNotifyContext,
): EmailMessage {
  const myBookings = `${ctx.siteUrl ?? siteBase()}/my-bookings`;
  return {
    templateVariables: bookingTemplateVariables(ctx),
    to: ctx.studentEmail,
    subject: `Booking request received - ${ctx.hostelName}`,
    text: [
      `Hi ${ctx.studentName},`,
      "",
      `We received your booking request for ${ctx.hostelName}, room ${ctx.roomNumber} (${ctx.roomType}).`,
      `Session: ${ctx.academicSession}`,
      `Amount: ${ghs(ctx.amount)}`,
      "",
      "Status: PENDING - the hostel manager will review your request.",
      `Track it here: ${myBookings}`,
    ].join("\n"),
    html: wrapHtml(
      "Booking request received",
      `<p>Hi ${escapeHtml(ctx.studentName)},</p>
       <p>We received your booking request for <strong>${escapeHtml(ctx.hostelName)}</strong>,
       room <strong>${escapeHtml(ctx.roomNumber)}</strong> (${escapeHtml(ctx.roomType)}).</p>
       <ul>
         <li>Session: ${escapeHtml(ctx.academicSession)}</li>
         <li>Amount: ${ghs(ctx.amount)}</li>
         <li>Status: <strong>PENDING</strong></li>
       </ul>
       <p><a href="${myBookings}">View my bookings</a></p>`,
    ),
  };
}

export function bookingCreatedStaffEmail(
  ctx: BookingNotifyContext,
): EmailMessage {
  const adminBookings = `${ctx.siteUrl ?? siteBase()}/admin/bookings`;
  const to = [
    ...(ctx.managerEmail ? [ctx.managerEmail] : []),
    ...(ctx.adminEmails ?? []),
  ];
  return {
    templateVariables: bookingTemplateVariables(ctx),
    to,
    subject: `New booking request - ${ctx.hostelName} room ${ctx.roomNumber}`,
    text: [
      ctx.managerName ? `Hi ${ctx.managerName},` : "Hello,",
      "",
      `${ctx.studentName} requested room ${ctx.roomNumber} (${ctx.roomType}) at ${ctx.hostelName}.`,
      `Session: ${ctx.academicSession}`,
      `Amount: ${ghs(ctx.amount)}`,
      "",
      `Review and approve/reject: ${adminBookings}`,
    ].join("\n"),
    html: wrapHtml(
      "New booking request",
      `<p>${ctx.managerName ? `Hi ${escapeHtml(ctx.managerName)},` : "Hello,"}</p>
       <p><strong>${escapeHtml(ctx.studentName)}</strong> requested room
       <strong>${escapeHtml(ctx.roomNumber)}</strong> (${escapeHtml(ctx.roomType)})
       at <strong>${escapeHtml(ctx.hostelName)}</strong>.</p>
       <ul>
         <li>Session: ${escapeHtml(ctx.academicSession)}</li>
         <li>Amount: ${ghs(ctx.amount)}</li>
       </ul>
       <p><a href="${adminBookings}">Review bookings</a></p>`,
    ),
  };
}

export function bookingApprovedStudentEmail(
  ctx: BookingNotifyContext,
): EmailMessage {
  const myBookings = `${ctx.siteUrl ?? siteBase()}/my-bookings`;
  return {
    templateVariables: bookingTemplateVariables(ctx),
    to: ctx.studentEmail,
    subject: `Booking approved - ${ctx.hostelName}`,
    text: [
      `Hi ${ctx.studentName},`,
      "",
      `Good news! Your booking at ${ctx.hostelName}, room ${ctx.roomNumber} has been approved.`,
      `Session: ${ctx.academicSession}`,
      `Amount due: ${ghs(ctx.amount)}`,
      "",
      "You can now submit your Mobile Money payment from My Bookings.",
      myBookings,
    ].join("\n"),
    html: wrapHtml(
      "Booking approved",
      `<p>Hi ${escapeHtml(ctx.studentName)},</p>
       <p>Your booking at <strong>${escapeHtml(ctx.hostelName)}</strong>, room
       <strong>${escapeHtml(ctx.roomNumber)}</strong> has been <strong>approved</strong>.</p>
       <p>Amount due: <strong>${ghs(ctx.amount)}</strong>. Submit Mobile Money payment from
       <a href="${myBookings}">My Bookings</a>.</p>`,
    ),
  };
}

export function bookingRejectedStudentEmail(
  ctx: BookingNotifyContext,
): EmailMessage {
  const myBookings = `${ctx.siteUrl ?? siteBase()}/my-bookings`;
  return {
    templateVariables: bookingTemplateVariables(ctx),
    to: ctx.studentEmail,
    subject: `Booking not approved - ${ctx.hostelName}`,
    text: [
      `Hi ${ctx.studentName},`,
      "",
      `Your booking request for ${ctx.hostelName}, room ${ctx.roomNumber} was not approved.`,
      "You can search for another room on the hostels page.",
      myBookings,
    ].join("\n"),
    html: wrapHtml(
      "Booking not approved",
      `<p>Hi ${escapeHtml(ctx.studentName)},</p>
       <p>Your booking request for <strong>${escapeHtml(ctx.hostelName)}</strong>, room
       <strong>${escapeHtml(ctx.roomNumber)}</strong> was not approved.</p>
       <p><a href="${myBookings}">View my bookings</a> or search for another room.</p>`,
    ),
  };
}

export function paymentSubmittedStaffEmail(
  ctx: BookingNotifyContext,
): EmailMessage {
  const adminPayments = `${ctx.siteUrl ?? siteBase()}/admin/payments`;
  const to = [
    ...(ctx.managerEmail ? [ctx.managerEmail] : []),
    ...(ctx.adminEmails ?? []),
  ];
  return {
    templateVariables: bookingTemplateVariables(ctx),
    to,
    subject: `Payment submitted - ${ctx.studentName} / ${ctx.hostelName}`,
    text: [
      ctx.managerName ? `Hi ${ctx.managerName},` : "Hello,",
      "",
      `${ctx.studentName} submitted a payment of ${ghs(ctx.amount)} for room ${ctx.roomNumber} at ${ctx.hostelName}.`,
      ctx.paymentReference
        ? `Reference: ${ctx.paymentReference}`
        : "Reference: (see admin panel)",
      "",
      `Verify it here: ${adminPayments}`,
    ].join("\n"),
    html: wrapHtml(
      "Payment submitted for verification",
      `<p>${ctx.managerName ? `Hi ${escapeHtml(ctx.managerName)},` : "Hello,"}</p>
       <p><strong>${escapeHtml(ctx.studentName)}</strong> submitted a payment of
       <strong>${ghs(ctx.amount)}</strong> for room <strong>${escapeHtml(ctx.roomNumber)}</strong>
       at <strong>${escapeHtml(ctx.hostelName)}</strong>.</p>
       ${ctx.paymentReference ? `<p>Reference: <code>${escapeHtml(ctx.paymentReference)}</code></p>` : ""}
       <p><a href="${adminPayments}">Verify payments</a></p>`,
    ),
  };
}

export function paymentVerifiedStudentEmail(
  ctx: BookingNotifyContext,
): EmailMessage {
  const myBookings = `${ctx.siteUrl ?? siteBase()}/my-bookings`;
  return {
    templateVariables: bookingTemplateVariables(ctx),
    to: ctx.studentEmail,
    subject: `Payment verified - ${ctx.hostelName}`,
    text: [
      `Hi ${ctx.studentName},`,
      "",
      `Your payment of ${ghs(ctx.amount)} for ${ctx.hostelName}, room ${ctx.roomNumber} has been verified.`,
      ctx.paymentReference ? `Reference: ${ctx.paymentReference}` : "",
      "",
      `You can print your receipt from: ${myBookings}`,
    ]
      .filter(Boolean)
      .join("\n"),
    html: wrapHtml(
      "Payment verified",
      `<p>Hi ${escapeHtml(ctx.studentName)},</p>
       <p>Your payment of <strong>${ghs(ctx.amount)}</strong> for
       <strong>${escapeHtml(ctx.hostelName)}</strong>, room
       <strong>${escapeHtml(ctx.roomNumber)}</strong> has been verified.</p>
       ${ctx.paymentReference ? `<p>Reference: <code>${escapeHtml(ctx.paymentReference)}</code></p>` : ""}
       <p><a href="${myBookings}">View receipt</a></p>`,
    ),
  };
}

/** Prefer SMTP when SMTP_HOST is set; otherwise console (demo / e2e). */
export function resolveMailerMode(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): "smtp" | "console" {
  return env.SMTP_HOST?.trim() ? "smtp" : "console";
}

/**
 * Outbound email can be paused without unsetting SMTP (useful in staging).
 * Unset / empty / anything other than 0|false|off means enabled.
 */
export function emailNotificationsEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  const raw = env.EMAIL_NOTIFICATIONS?.trim().toLowerCase();
  return raw !== "0" && raw !== "false" && raw !== "off";
}

export type MailerDelivery = "sent" | "logged" | "failed" | "skipped";

export type MailerStatus = {
  mode: "smtp" | "console";
  enabled: boolean;
  host: string | null;
  port: number;
  secure: boolean;
  hasAuth: boolean;
  user: string | null;
  from: string;
  siteUrl: string;
};

/** Safe-to-display SMTP snapshot - never includes the password. */
export function describeMailer(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): MailerStatus {
  const mode = resolveMailerMode(env);
  const host = env.SMTP_HOST?.trim() || null;
  return {
    mode,
    enabled: emailNotificationsEnabled(env),
    host,
    port: Number(env.SMTP_PORT || 587),
    secure: env.SMTP_SECURE === "1" || env.SMTP_SECURE === "true",
    hasAuth: Boolean(env.SMTP_USER?.trim() && env.SMTP_PASS),
    user: env.SMTP_USER?.trim() || null,
    from:
      env.SMTP_FROM?.trim() ||
      env.MAIL_FROM?.trim() ||
      "ATU Hostel Booking <noreply@localhost>",
    siteUrl: siteBase(env),
  };
}

export function testEmail(to: string, siteUrl?: string): EmailMessage {
  const origin = siteUrl ?? siteBase();
  return {
    templateVariables: { siteUrl: origin, name: "Test" },
    to,
    subject: "ATU Hostel Booking - test email",
    text: [
      "This is a test message from the HBMS notifications panel.",
      "",
      "If you received this, outbound email is working.",
      origin,
    ].join("\n"),
    html: wrapHtml(
      "Test email",
      `<p>This is a test message from the HBMS notifications panel.</p>
       <p>If you received this, outbound email is working.</p>
       <p><a href="${origin}">Open ATU Hostel Booking</a></p>`,
    ),
  };
}

export type NotificationEventSpec = {
  id: string;
  label: string;
  audience: "Student" | "Staff" | "Account holder";
  trigger: string;
  href: string;
};

/** Catalog shown on the admin notifications page. */
export const NOTIFICATION_EVENTS: readonly NotificationEventSpec[] = [
  {
    id: "booking.received.student",
    label: "Booking request received",
    audience: "Student",
    trigger: "A student submits a room booking",
    href: "/my-bookings",
  },
  {
    id: "booking.created.staff",
    label: "New booking to review",
    audience: "Staff",
    trigger: "A student submits a room booking",
    href: "/admin/bookings",
  },
  {
    id: "booking.approved.student",
    label: "Booking approved",
    audience: "Student",
    trigger: "A manager or admin approves a request",
    href: "/my-bookings",
  },
  {
    id: "booking.rejected.student",
    label: "Booking not approved",
    audience: "Student",
    trigger: "A manager or admin rejects a request",
    href: "/my-bookings",
  },
  {
    id: "payment.submitted.staff",
    label: "Payment submitted",
    audience: "Staff",
    trigger: "A student submits a Mobile Money reference",
    href: "/admin/payments",
  },
  {
    id: "payment.verified.student",
    label: "Payment verified",
    audience: "Student",
    trigger: "A manager or admin verifies a payment",
    href: "/my-bookings",
  },
  {
    id: "auth.password_reset",
    label: "Password reset",
    audience: "Account holder",
    trigger: "Someone requests a password reset for the account",
    href: "/login",
  },
];

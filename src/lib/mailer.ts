import "server-only";

import {
  emailNotificationsEnabled,
  passwordResetEmail,
  resolveMailerMode,
  testEmail,
  type EmailMessage,
  type MailerDelivery,
} from "@/lib/email-templates";
import {
  mailtrapApiReady,
  mailtrapTemplateUuid,
  sendMailtrapTemplate,
} from "@/lib/mailtrap-api";

export type { MailerDelivery };

/**
 * Outbound email - mock-behind-an-interface (same pattern as the payment
 * gateway). Default is the console transport so local/e2e work with no SMTP.
 * Set SMTP_HOST (+ credentials) to switch to real delivery via nodemailer.
 */

export type { EmailMessage };

export type Mailer = {
  send(message: EmailMessage): Promise<void>;
};

function recipients(to: string | string[]): string[] {
  return (Array.isArray(to) ? to : [to]).map((s) => s.trim()).filter(Boolean);
}

function logEmail(message: EmailMessage) {
  const to = recipients(message.to).join(", ");
  // eslint-disable-next-line no-console
  console.log(
    `[mailer] to=${to} subject="${message.subject}"\n${message.text}`,
  );
}

export const consoleMailer: Mailer = {
  async send(message) {
    logEmail(message);
  },
};

/**
 * SMTP transport (Gmail, Mailtrap, SendGrid SMTP, etc.). Created only when
 * SMTP_HOST is present.
 */
export function createSmtpMailer(env: NodeJS.ProcessEnv = process.env): Mailer {
  const host = env.SMTP_HOST?.trim();
  if (!host) {
    throw new Error("SMTP_HOST is required for the SMTP mailer.");
  }

  let transporterPromise: Promise<import("nodemailer").Transporter> | null =
    null;

  async function getTransporter() {
    if (!transporterPromise) {
      transporterPromise = (async () => {
        const nodemailer = await import("nodemailer");
        return nodemailer.createTransport({
          host,
          port: Number(env.SMTP_PORT || 587),
          secure: env.SMTP_SECURE === "1" || env.SMTP_SECURE === "true",
          auth:
            env.SMTP_USER && env.SMTP_PASS
              ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
              : undefined,
        });
      })();
    }
    return transporterPromise;
  }

  const from =
    env.SMTP_FROM?.trim() ||
    env.MAIL_FROM?.trim() ||
    "ATU Hostel Booking <noreply@localhost>";

  return {
    async send(message) {
      const to = recipients(message.to);
      if (to.length === 0) return;

      const transporter = await getTransporter();
      await transporter.sendMail({
        from,
        to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    },
  };
}

/** Pick console (default) or SMTP when SMTP_HOST is set. */
export function mailerFor(env: NodeJS.ProcessEnv = process.env): Mailer {
  if (resolveMailerMode(env) === "smtp") {
    return createSmtpMailer(env);
  }
  return consoleMailer;
}

/**
 * Whether the reset link may be returned in API/action responses for display
 * in the UI. Never in production - there the link exists only in the email.
 * The e2e suite runs `next dev`, so NODE_ENV=development gives tests the link.
 */
export function showResetLinkInResponse(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.NODE_ENV !== "production" || env.RESET_LINK_IN_RESPONSE === "1";
}

/** Convenience wrapper used by auth password-reset. */
export async function sendPasswordReset(
  to: string,
  url: string,
  mailer: Mailer = mailerFor(),
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const message = passwordResetEmail(to, url);
  const uuid = mailtrapTemplateUuid("auth.password_reset", env);
  if (uuid && mailtrapApiReady(env)) {
    await sendMailtrapTemplate(
      {
        to: [to],
        templateUuid: uuid,
        variables: message.templateVariables,
      },
      env,
    );
    return;
  }
  await mailer.send(message);
}

/**
 * Send a test message. Returns the delivery status rather than throwing so
 * the admin panel can show a friendly result (console vs SMTP vs skipped).
 */
export async function sendTestEmail(
  to: string,
  mailer: Mailer = mailerFor(),
  env: NodeJS.ProcessEnv = process.env,
): Promise<MailerDelivery> {
  if (!emailNotificationsEnabled(env)) return "skipped";
  const mode = resolveMailerMode(env);
  const message = testEmail(to);
  try {
    const uuid = mailtrapTemplateUuid("email.test", env);
    if (uuid && mailtrapApiReady(env)) {
      await sendMailtrapTemplate(
        {
          to: [to],
          templateUuid: uuid,
          variables: message.templateVariables,
        },
        env,
      );
      return "sent";
    }
    await mailer.send(message);
    return mode === "smtp" ? "sent" : "logged";
  } catch {
    return "failed";
  }
}

/** Probe the configured transport without sending a message. */
export async function verifyMailer(
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ ok: boolean; message: string }> {
  if (!emailNotificationsEnabled(env)) {
    return {
      ok: true,
      message: "Outbound email is paused (EMAIL_NOTIFICATIONS=off).",
    };
  }
  if (resolveMailerMode(env) !== "smtp") {
    return {
      ok: true,
      message: "Console mailer is active. Emails are printed in the server log.",
    };
  }
  const host = env.SMTP_HOST?.trim();
  if (!host) {
    return { ok: false, message: "SMTP_HOST is not set." };
  }
  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host,
      port: Number(env.SMTP_PORT || 587),
      secure: env.SMTP_SECURE === "1" || env.SMTP_SECURE === "true",
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
    });
    await transporter.verify();
    return { ok: true, message: `Connected to ${host}.` };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Connection failed.";
    return { ok: false, message: detail };
  }
}

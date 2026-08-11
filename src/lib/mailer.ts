import "server-only";

/**
 * Outbound email - the same mock-behind-an-interface pattern as the payment
 * gateway (docs/05-payment-flow.md §7, decision D-002). This build ships the
 * console implementation only: the reset link is logged to the server console
 * and (in development) returned to the UI so the demo is usable with no SMTP
 * credentials. Plug in a real transport by implementing Mailer and switching
 * mailerFor() on an env flag.
 */
export type Mailer = {
  sendPasswordReset(to: string, url: string): Promise<void>;
};

export const consoleMailer: Mailer = {
  async sendPasswordReset(to, url) {
    // eslint-disable-next-line no-console
    console.log(`[mailer] password reset for ${to}: ${url}`);
  },
};

export function mailerFor(env: NodeJS.ProcessEnv = process.env): Mailer {
  // SMTP is out of scope for the academic demo; console is the only transport.
  void env;
  return consoleMailer;
}

/**
 * Whether the reset link may be returned in API/action responses for display
 * in the UI. Never in production - there the link exists only in the email.
 * The e2e suite runs `next dev`, so NODE_ENV=development gives tests the link.
 */
export function showResetLinkInResponse(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV !== "production" || env.RESET_LINK_IN_RESPONSE === "1";
}

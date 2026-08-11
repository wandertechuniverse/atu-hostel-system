import { handleApiError, ok, readJson, clientIp } from "@/lib/api";
import { requestPasswordReset } from "@/lib/services/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/forgot-password - public. Body: { "email": "…" }.
 * Issues a single-use reset token and mails the link (console mailer in this
 * build). The response is the same whether or not the account exists, so the
 * endpoint cannot enumerate users. In development the response carries
 * { "devResetUrl": "…" } so the demo is usable with no SMTP credentials;
 * in production the link exists only in the email. Throttled per email+IP.
 */
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const origin = new URL(request.url).origin;
    const result = await requestPasswordReset(
      { email: body.email },
      await clientIp(),
      origin,
    );
    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}

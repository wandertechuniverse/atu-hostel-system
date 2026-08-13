import { handleApiError, ok, readJson } from "@/lib/api";
import { requireApiRole } from "@/lib/api-auth";
import { describeMailer, describeMailtrap } from "@/lib/email-templates";
import { validationError } from "@/lib/services/errors";
import {
  probeMailer,
  sendAdminTestEmail,
} from "@/lib/services/notifications";

export const dynamic = "force-dynamic";

/**
 * GET /api/smtp - administrator only. Safe SMTP snapshot (no password).
 */
export async function GET() {
  try {
    await requireApiRole("ADMIN");
    return ok({
      ...describeMailer(),
      mailtrap: describeMailtrap(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/smtp - administrator only.
 *   { "action": "verify" }
 *   { "action": "test", "to": "admin@atu.edu.gh" }
 * `to` without action is treated as a test send.
 */
export async function POST(request: Request) {
  try {
    const session = await requireApiRole("ADMIN");
    const body = await readJson(request);
    const action = String(body.action ?? (body.to ? "test" : "verify"));

    if (action === "verify") {
      const result = await probeMailer();
      return ok({
        action: "verify",
        ok: result.ok,
        message: result.message,
      });
    }

    if (action === "test") {
      const delivery = await sendAdminTestEmail(session.userId!, {
        to: body.to,
      });
      return ok({
        action: "test",
        ok: delivery !== "failed",
        delivery,
      });
    }

    throw validationError('action must be "verify" or "test".');
  } catch (error) {
    return handleApiError(error);
  }
}

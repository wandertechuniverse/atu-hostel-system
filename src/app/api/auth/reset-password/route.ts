import { handleApiError, ok, readJson, clientIp } from "@/lib/api";
import { resetPassword } from "@/lib/services/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/reset-password - public. Body:
 *   { "token": "…", "newPassword": "…", "confirmPassword": "…" }
 * Redeems the single-use token from the reset email. Invalid or expired
 * tokens get a generic 400; success re-hashes the password and deletes the
 * token. Throttled per token+IP.
 */
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const result = await resetPassword(
      {
        token: body.token,
        newPassword: body.newPassword,
        confirmPassword: body.confirmPassword,
      },
      await clientIp(),
    );
    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}

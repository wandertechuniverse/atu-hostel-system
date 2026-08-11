import { handleApiError, ok, readJson } from "@/lib/api";
import { requireApiSession } from "@/lib/api-auth";
import { changeOwnPassword } from "@/lib/services/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/change-password - any signed-in role. Body:
 *   { "currentPassword": "…", "newPassword": "…", "confirmPassword": "…" }
 * The current password is verified server-side; the new one is bcrypt-hashed
 * and an auth.password_changed audit entry is written. Wrong current password
 * → 400 VALIDATION; anonymous caller → 401.
 */
export async function POST(request: Request) {
  try {
    const session = await requireApiSession();
    const body = await readJson(request);
    const result = await changeOwnPassword(session, {
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
      confirmPassword: body.confirmPassword,
    });
    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}

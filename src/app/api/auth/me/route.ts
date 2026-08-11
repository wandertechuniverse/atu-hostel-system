import { handleApiError, ok } from "@/lib/api";
import { requireApiSession } from "@/lib/api-auth";
import { currentUser } from "@/lib/services/auth";

export const dynamic = "force-dynamic";

/** GET /api/auth/me - the signed-in user (DB-validated). */
export async function GET() {
  try {
    const session = await requireApiSession();
    const user = await currentUser(session.userId!);
    return ok({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

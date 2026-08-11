import { handleApiError, noContent } from "@/lib/api";
import { logoutUser } from "@/lib/services/auth";

export const dynamic = "force-dynamic";

/** POST /api/auth/logout - destroy the session cookie. */
export async function POST() {
  try {
    await logoutUser();
    return noContent();
  } catch (error) {
    return handleApiError(error);
  }
}

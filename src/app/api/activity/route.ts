import { handleApiError, ok } from "@/lib/api";
import { requireApiRole } from "@/lib/api-auth";
import { listActivity, parseActivityQuery } from "@/lib/services/activity";

export const dynamic = "force-dynamic";

/**
 * GET /api/activity?action=…&page=… - paginated activity log (admin only).
 * Default page size 25, newest first.
 */
export async function GET(request: Request) {
  try {
    const session = await requireApiRole("ADMIN");
    const query = parseActivityQuery(new URL(request.url).searchParams);
    return ok(await listActivity(session, query));
  } catch (error) {
    return handleApiError(error);
  }
}

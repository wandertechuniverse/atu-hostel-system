import { handleApiError, ok, readJson } from "@/lib/api";
import { requireApiRole } from "@/lib/api-auth";
import { setHostelManager } from "@/lib/services/hostels";
import { validationError } from "@/lib/services/errors";

export const dynamic = "force-dynamic";

/**
 * PUT /api/hostels/:id/manager - set who manages a hostel (admin only).
 * Body: `{ "userId": "<id>" }` to assign (promotes a student, demotes the
 * previous manager), or `{ "userId": null }` to clear the manager.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiRole("ADMIN");
    const { id } = await params;
    const body = await readJson(request);
    if (!("userId" in body)) {
      throw validationError("Missing userId.");
    }
    if (body.userId !== null && typeof body.userId !== "string") {
      throw validationError("userId must be a string or null.");
    }
    const hostel = await setHostelManager(session, id, body.userId);
    return ok({ hostel });
  } catch (error) {
    return handleApiError(error);
  }
}

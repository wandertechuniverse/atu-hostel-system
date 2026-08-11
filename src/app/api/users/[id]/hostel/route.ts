import { handleApiError, ok, readJson } from "@/lib/api";
import { requireApiRole } from "@/lib/api-auth";
import { assignManager } from "@/lib/services/users";
import { validationError } from "@/lib/services/errors";

export const dynamic = "force-dynamic";

/**
 * PUT /api/users/:id/hostel - assign (or unassign) a hostel manager (admin only).
 * Body: { "hostelId": string | null }. Assigning promotes a student to manager;
 * unassigning demotes a manager back to student. One manager per hostel.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiRole("ADMIN");
    const { id } = await params;
    const body = await readJson(request);

    let hostelId: string | null;
    if (typeof body.hostelId === "string") hostelId = body.hostelId;
    else if (body.hostelId === null) hostelId = null;
    else throw validationError("hostelId must be a string or null.");

    const user = await assignManager(session, id, hostelId);
    return ok({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

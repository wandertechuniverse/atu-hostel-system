import { getSession } from "@/lib/auth";
import { handleApiError, noContent, ok, readJson } from "@/lib/api";
import { requireApiRole } from "@/lib/api-auth";
import {
  deleteHostel,
  getHostelById,
  updateHostel,
} from "@/lib/services/hostels";
import { validationError } from "@/lib/services/errors";

export const dynamic = "force-dynamic";

/** GET /api/hostels/:id - public (approved only) or staff-scoped detail. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    return ok(await getHostelById(session, id));
  } catch (error) {
    return handleApiError(error);
  }
}

/** PATCH /api/hostels/:id - edit fields (manager: own; admin: any). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiRole("MANAGER", "ADMIN");
    const { id } = await params;
    const body = await readJson(request);
    if ("isApproved" in body || "manager" in body || "managerId" in body) {
      throw validationError(
        "isApproved and the manager link are managed server-side only.",
      );
    }
    const hostel = await updateHostel(session, id, body);
    return ok({ hostel });
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/hostels/:id - admin only; 409 while any room has bookings. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiRole("ADMIN");
    const { id } = await params;
    await deleteHostel(session, id);
    return noContent();
  } catch (error) {
    return handleApiError(error);
  }
}

import { handleApiError, noContent, ok, readJson } from "@/lib/api";
import { requireApiRole } from "@/lib/api-auth";
import { deleteRoom, updateRoom } from "@/lib/services/hostels";

export const dynamic = "force-dynamic";

/** PATCH /api/rooms/:id - edit a room (manager: own hostel; admin: any). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiRole("MANAGER", "ADMIN");
    const { id } = await params;
    const body = await readJson(request);
    const room = await updateRoom(session, id, body);
    return ok({ room });
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/rooms/:id - 409 while the room has bookings. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiRole("MANAGER", "ADMIN");
    const { id } = await params;
    await deleteRoom(session, id);
    return noContent();
  } catch (error) {
    return handleApiError(error);
  }
}

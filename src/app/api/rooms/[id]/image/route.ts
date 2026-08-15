import { handleApiError, noContent, ok } from "@/lib/api";
import { requireApiRole } from "@/lib/api-auth";
import { removeRoomImage, uploadRoomImage } from "@/lib/services/hostels";
import { validationError } from "@/lib/services/errors";

export const dynamic = "force-dynamic";

/** POST /api/rooms/:id/image - upload a room photo (manager: own; admin: any). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiRole("MANAGER", "ADMIN");
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw validationError("Choose an image to upload.");
    }
    const updated = await uploadRoomImage(session, id, {
      type: file.type,
      size: file.size,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    return ok({ room: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/rooms/:id/image - remove the room photo. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiRole("MANAGER", "ADMIN");
    const { id } = await params;
    await removeRoomImage(session, id);
    return noContent();
  } catch (error) {
    return handleApiError(error);
  }
}

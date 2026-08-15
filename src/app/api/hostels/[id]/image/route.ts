import { handleApiError, noContent, ok } from "@/lib/api";
import { requireApiRole } from "@/lib/api-auth";
import {
  removeHostelImage,
  uploadHostelImage,
} from "@/lib/services/hostels";
import { validationError } from "@/lib/services/errors";

export const dynamic = "force-dynamic";

/**
 * POST /api/hostels/:id/image - replace the hostel photo with a multipart
 * upload (field "file"; JPEG, PNG or WebP, max 10 MB). Manager: own hostel;
 * admin: any. Same service the admin form uses.
 */
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
    const updated = await uploadHostelImage(session, id, {
      type: file.type,
      size: file.size,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    return ok({ hostel: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/hostels/:id/image - remove the hostel photo (manager: own;
 * admin: any). Uploaded files are deleted from disk; seed photos stay on
 * disk but are unlinked from the record. Idempotent - 204 either way.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiRole("MANAGER", "ADMIN");
    const { id } = await params;
    await removeHostelImage(session, id);
    return noContent();
  } catch (error) {
    return handleApiError(error);
  }
}

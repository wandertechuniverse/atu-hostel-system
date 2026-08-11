import { handleApiError, noContent, ok, readJson } from "@/lib/api";
import { requireApiRole } from "@/lib/api-auth";
import {
  deleteUser,
  setUserActive,
  updateUser,
} from "@/lib/services/users";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/users/:id - administrator only.
 * Two shapes, both idempotent:
 *  - { "isActive": boolean }                      activate / deactivate
 *  - { name, email, phone, studentIdNumber?,
 *      department?, password? }                    edit profile / reset password
 * A blank/absent password keeps the current hash. Role and hostelId are never
 * accepted from the client (docs/11-api.md).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiRole("ADMIN");
    const { id } = await params;
    const body = await readJson(request);

    if (typeof body.isActive === "boolean") {
      const result = await setUserActive(session, id, body.isActive);
      return ok(result);
    }

    const password =
      body.password === null || body.password === undefined
        ? null
        : body.password;
    const result = await updateUser(session, id, {
      name: body.name,
      email: body.email,
      phone: body.phone,
      studentIdNumber: body.studentIdNumber,
      department: body.department,
      password,
    });
    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/users/:id - administrator only. Hard-deletes an account with
 * no booking history (the booking-history guard returns 409 otherwise - the
 * bookings and payments reference the user, so deactivate instead). Deleting
 * your own account is also 409. Audit-log rows are kept but lose the actor
 * link; a deleted manager's hostel becomes managerless. Audits user.deleted.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiRole("ADMIN");
    const { id } = await params;
    await deleteUser(session, id);
    return noContent();
  } catch (error) {
    return handleApiError(error);
  }
}

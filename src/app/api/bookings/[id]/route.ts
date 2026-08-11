import { handleApiError, ok, readJson } from "@/lib/api";
import { requireApiRole } from "@/lib/api-auth";
import { approveBooking, rejectBooking, verifyPayment } from "@/lib/services/bookings";
import { validationError } from "@/lib/services/errors";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/bookings/:id - manager/admin row action.
 * Body: { "action": "approve" | "reject" | "verify" }.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiRole("MANAGER", "ADMIN");
    const { id } = await params;
    const body = await readJson(request);

    if (body.action === "approve") {
      return ok({ booking: await approveBooking(session, id) });
    }
    if (body.action === "reject") {
      return ok({ booking: await rejectBooking(session, id) });
    }
    if (body.action === "verify") {
      return ok({ payment: await verifyPayment(session, id) });
    }
    throw validationError('action must be "approve", "reject" or "verify".');
  } catch (error) {
    return handleApiError(error);
  }
}

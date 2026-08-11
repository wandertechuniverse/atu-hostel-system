import { created, handleApiError, ok, readJson } from "@/lib/api";
import { requireApiRole, requireApiSession } from "@/lib/api-auth";
import { listPayments, submitPayment } from "@/lib/services/bookings";
import { validationError } from "@/lib/services/errors";

export const dynamic = "force-dynamic";

/** GET /api/payments - student: own payments; manager: own hostel; admin: all. */
export async function GET() {
  try {
    const session = await requireApiSession();
    return ok(await listPayments(session));
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/payments - student submits a simulated MoMo payment for one of
 * their approved bookings. Body: { bookingId, provider, phone, reference }.
 * The amount is snapshotted from the booking, never from the client; the
 * payment stays PENDING until a manager/admin verifies it.
 */
export async function POST(request: Request) {
  try {
    const session = await requireApiRole("STUDENT");
    const body = await readJson(request);
    if (typeof body.bookingId !== "string") {
      throw validationError("bookingId is required.");
    }
    const payment = await submitPayment(session, body.bookingId, {
      provider: body.provider,
      phone: body.phone,
      reference: body.reference,
    });
    return created(payment);
  } catch (error) {
    return handleApiError(error);
  }
}

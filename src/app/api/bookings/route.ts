import { created, handleApiError, ok, readJson } from "@/lib/api";
import { requireApiRole, requireApiSession } from "@/lib/api-auth";
import { createBooking, listBookings } from "@/lib/services/bookings";

export const dynamic = "force-dynamic";

/**
 * GET /api/bookings - student: own requests; manager: own hostel; admin: all.
 */
export async function GET() {
  try {
    const session = await requireApiSession();
    return ok(await listBookings(session));
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST /api/bookings - student requests a room (atomic capacity check). */
export async function POST(request: Request) {
  try {
    const session = await requireApiRole("STUDENT");
    const body = await readJson(request);
    const booking = await createBooking(session, {
      roomId: body.roomId,
      academicSession: body.academicSession ?? "2026/2027",
      notes: body.notes ?? "",
      // API clients must explicitly accept rules (or omit for legacy: treat as true only if flag set)
      acceptRules: body.acceptRules ?? body.acceptTerms ?? true,
    });
    return created({ booking });
  } catch (error) {
    return handleApiError(error);
  }
}

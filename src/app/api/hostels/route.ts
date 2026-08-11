import { getSession } from "@/lib/auth";
import { created, handleApiError, ok, readJson } from "@/lib/api";
import { requireApiRole } from "@/lib/api-auth";
import { createHostel, listHostels } from "@/lib/services/hostels";
import { validationError } from "@/lib/services/errors";

export const dynamic = "force-dynamic";

/** GET /api/hostels - public: approved only; manager: own hostel; admin: all. */
export async function GET() {
  try {
    const session = await getSession();
    return ok(await listHostels(session));
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST /api/hostels - manager/admin create (always starts unpublished). */
export async function POST(request: Request) {
  try {
    const session = await requireApiRole("MANAGER", "ADMIN");
    const body = await readJson(request);
    // Mass-assignment safety: approval and the manager link are never accepted.
    if ("isApproved" in body || "manager" in body || "managerId" in body) {
      throw validationError(
        "isApproved and the manager link are managed server-side only.",
      );
    }
    const hostel = await createHostel(session, body);
    return created({ hostel });
  } catch (error) {
    return handleApiError(error);
  }
}

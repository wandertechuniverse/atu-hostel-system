import { getSession } from "@/lib/auth";
import { created, handleApiError, ok, readJson } from "@/lib/api";
import { requireApiRole } from "@/lib/api-auth";
import { createRoom, listRooms } from "@/lib/services/hostels";

export const dynamic = "force-dynamic";

/** GET /api/hostels/:id/rooms - with derived availability (never stored). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession();
    return ok(await listRooms(session, id));
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST /api/hostels/:id/rooms - add a room (manager: own hostel; admin: any). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiRole("MANAGER", "ADMIN");
    const { id } = await params;
    const body = await readJson(request);
    const room = await createRoom(session, id, body);
    return created({ room });
  } catch (error) {
    return handleApiError(error);
  }
}

import { created, handleApiError, ok, readJson } from "@/lib/api";
import { requireApiRole } from "@/lib/api-auth";
import { createUser, listUsers } from "@/lib/services/users";

export const dynamic = "force-dynamic";

/** GET /api/users - administrator only. */
export async function GET() {
  try {
    const session = await requireApiRole("ADMIN");
    const users = await listUsers();
    return ok({ users, actor: { id: session.userId } });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/users - administrator only. Create a student, manager or
 * sub-admin account directly. The role comes from this ADMIN-guarded route
 * (never from an anonymous client); unique email/student ID return 409.
 * Managers created here have no hostel until one is assigned.
 */
export async function POST(request: Request) {
  try {
    const session = await requireApiRole("ADMIN");
    const body = await readJson(request);
    const user = await createUser(session, {
      name: body.name,
      email: body.email,
      studentIdNumber: body.studentIdNumber,
      phone: body.phone,
      role: body.role,
      password: body.password,
    });
    return created({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

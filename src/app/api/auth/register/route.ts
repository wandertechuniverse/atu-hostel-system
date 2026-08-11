import { created, handleApiError, readJson } from "@/lib/api";
import { registerUser } from "@/lib/services/auth";

export const dynamic = "force-dynamic";

/** POST /api/auth/register - create a student account and sign it in. */
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const { user } = await registerUser({
      name: body.name,
      email: body.email,
      studentIdNumber: body.studentIdNumber,
      phone: body.phone,
      password: body.password,
    });
    return created({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

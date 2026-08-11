import { clientIp, handleApiError, ok, readJson } from "@/lib/api";
import { loginUser } from "@/lib/services/auth";

export const dynamic = "force-dynamic";

/** POST /api/auth/login - verify credentials and set the session cookie. */
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const result = await loginUser(
      { email: body.email, password: body.password },
      await clientIp(),
    );
    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}

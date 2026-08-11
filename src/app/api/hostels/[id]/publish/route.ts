import { handleApiError, ok } from "@/lib/api";
import { requireApiRole } from "@/lib/api-auth";
import { toggleHostelApproval } from "@/lib/services/hostels";

export const dynamic = "force-dynamic";

/** POST /api/hostels/:id/publish - toggle approved (admin only). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireApiRole("ADMIN");
    const { id } = await params;
    const result = await toggleHostelApproval(session, id);
    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}

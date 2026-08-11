import { handleApiError, ok } from "@/lib/api";
import { requireApiRole } from "@/lib/api-auth";
import { exportDatabase } from "@/lib/services/export";

export const dynamic = "force-dynamic";

/**
 * GET /api/export - administrator only. Full database snapshot as JSON with
 * password hashes stripped. Every export writes a database.exported audit
 * entry. Download with curl -b cookies -o backup.json http://…/api/export
 */
export async function GET() {
  try {
    const session = await requireApiRole("ADMIN");
    const payload = await exportDatabase(session.userId ?? null);
    return ok(payload);
  } catch (error) {
    return handleApiError(error);
  }
}

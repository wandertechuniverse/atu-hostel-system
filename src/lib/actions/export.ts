"use server";

import { requireRole } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { errorMessage } from "@/lib/services/errors";
import {
  exportDatabase,
  type DatabaseExport,
} from "@/lib/services/export";

export type ExportState =
  | { ok?: boolean; error?: string; payload?: DatabaseExport };

/**
 * Admin-only database export. Returns the full JSON snapshot (password
 * hashes stripped) so the client can save it as a backup file; the same
 * service backs GET /api/export. Every export is written to the audit log.
 */
export async function exportDatabaseAction(
  _prev: ExportState,
  formData: FormData,
): Promise<ExportState> {
  try {
    await requireCsrf(formData);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  const session = await requireRole("ADMIN");
  try {
    const payload = await exportDatabase(session.userId ?? null);
    return { ok: true, payload };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

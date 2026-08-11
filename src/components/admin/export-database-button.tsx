"use client";

import { useActionState, useEffect } from "react";
import { CsrfInput } from "@/components/csrf-input";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  exportDatabaseAction,
  type ExportState,
} from "@/lib/actions/export";
import type { DatabaseExport } from "@/lib/services/export";

const initial: ExportState = {};

function download(payload: DatabaseExport) {
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `hbms-backup-${stamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Admin-only full-database export. Calls the same exportDatabase service the
 * REST endpoint uses; the snapshot is saved as a JSON backup file. Password
 * hashes are never included (stripped in the service).
 */
export function ExportDatabaseButton({
  counts,
}: {
  counts: DatabaseExport["counts"];
}) {
  const [state, formAction, pending] = useActionState(
    exportDatabaseAction,
    initial,
  );

  // Fire once the action resolves: download on success, toast on failure.
  useEffect(() => {
    if (state.ok && state.payload) {
      download(state.payload);
      toast.success("Database exported", {
        description: `${state.payload.counts.users} users, ${state.payload.counts.bookings} bookings, ${state.payload.counts.payments} payments.`,
      });
    } else if (state.error) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction}>
      <CsrfInput />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={pending}
        title={`Back up ${counts.users} users, ${counts.hostels} hostels, ${counts.bookings} bookings`}
      >
        <Download className="size-4" />
        {pending ? "Exporting…" : "Export database"}
      </Button>
    </form>
  );
}

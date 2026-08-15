"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function escapeCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(",")),
  ];
  return `\uFEFF${lines.join("\n")}`; // BOM so Excel reads GH₵ correctly
}

export function ExportCsvButton({
  rows,
  filename,
  label = "Export CSV",
  className,
}: {
  rows: Record<string, unknown>[];
  filename: string;
  label?: string;
  className?: string;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      className={className}
      disabled={rows.length === 0}
      onClick={() => {
        const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        toast.success("CSV downloaded", {
          description: `${rows.length} record${rows.length === 1 ? "" : "s"} · ${filename}`,
        });
      }}
    >
      <Download className="size-4" />
      {label}
    </Button>
  );
}

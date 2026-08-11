"use client";

import type { DayPoint } from "@/lib/services/analytics";

const ghs = (n: number) =>
  `GH₵ ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

/** Pure-CSS bar chart for booking / revenue trends (no chart dependency). */
export function TrendBars({
  points,
  mode,
}: {
  points: DayPoint[];
  mode: "count" | "amount";
}) {
  const values = points.map((p) => (mode === "count" ? p.count : p.amount));
  const max = Math.max(1, ...values);

  return (
    <div className="space-y-3">
      <div className="flex h-40 items-end gap-1">
        {points.map((p) => {
          const v = mode === "count" ? p.count : p.amount;
          const h = Math.max(4, Math.round((v / max) * 100));
          return (
            <div
              key={p.date}
              className="group relative flex min-w-0 flex-1 flex-col items-center justify-end"
            >
              <div
                className="w-full max-w-[18px] rounded-t bg-primary/80 transition-colors group-hover:bg-primary"
                style={{ height: `${h}%` }}
                title={`${p.label}: ${mode === "count" ? v : ghs(v)}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{points[0]?.label}</span>
        <span>{points[Math.floor(points.length / 2)]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function DistributionList({
  items,
  total,
}: {
  items: { label: string; count: number; tone?: string }[];
  total: number;
}) {
  const max = Math.max(1, ...items.map((i) => i.count), total);
  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">No data yet.</p>
      )}
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{item.label}</span>
            <span className="text-muted-foreground">
              {item.count}
              {total > 0 ? ` · ${Math.round((item.count / total) * 100)}%` : ""}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${item.tone ?? "bg-primary"}`}
              style={{ width: `${Math.round((item.count / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

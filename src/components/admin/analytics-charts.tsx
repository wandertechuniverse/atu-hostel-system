"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DayPoint } from "@/lib/services/analytics";
import { cn } from "@/lib/utils";

const ghs = (n: number) =>
  `GH₵ ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  CONFIRMED: "#10b981",
  CANCELLED: "#ef4444",
  COMPLETED: "#0ea5e9",
  SUCCESS: "#10b981",
  FAILED: "#ef4444",
};

const FALLBACK_PALETTE = [
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
];

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  fontSize: 12,
  boxShadow: "0 8px 24px rgb(0 0 0 / 0.12)",
};

/** Interactive area chart for booking / revenue trends. */
export function TrendBars({
  points,
  mode,
  className,
}: {
  points: DayPoint[];
  mode: "count" | "amount";
  className?: string;
}) {
  const data = points.map((p) => ({
    ...p,
    value: mode === "count" ? p.count : p.amount,
  }));
  const gradientId = mode === "count" ? "fillBookings" : "fillRevenue";
  const stroke = mode === "count" ? "#6366f1" : "#10b981";

  // Sparse tick labels so long ranges stay readable.
  const tickEvery = Math.max(1, Math.ceil(data.length / 7));

  return (
    <div className={cn("h-64 w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            minTickGap={16}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            interval={0}
            ticks={data.filter((_, i) => i % tickEvery === 0 || i === data.length - 1).map((d) => d.label)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={mode === "amount" ? 56 : 36}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(v: number) =>
              mode === "amount"
                ? v >= 1000
                  ? `${Math.round(v / 1000)}k`
                  : String(v)
                : String(v)
            }
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ fontWeight: 600, marginBottom: 4 }}
            formatter={(value) => {
              const n = typeof value === "number" ? value : Number(value ?? 0);
              return [
                mode === "count" ? `${n} booking${n === 1 ? "" : "s"}` : ghs(n),
                mode === "count" ? "Bookings" : "Revenue",
              ];
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            animationDuration={600}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut chart for status distributions. */
export function DistributionList({
  items,
  total,
  className,
}: {
  items: { label: string; count: number; tone?: string }[];
  total: number;
  className?: string;
}) {
  const data = items
    .filter((i) => i.count > 0)
    .map((i) => ({ name: i.label, value: i.count }));

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>;
  }

  return (
    <div className={cn("grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px] sm:items-center", className)}>
      <div className="h-52 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
              animationDuration={600}
            >
              {data.map((entry, i) => (
                <Cell
                  key={entry.name}
                  fill={STATUS_COLORS[entry.name] ?? FALLBACK_PALETTE[i % FALLBACK_PALETTE.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => {
                const n = typeof value === "number" ? value : Number(value ?? 0);
                const pct = total > 0 ? Math.round((n / total) * 100) : 0;
                return [`${n} · ${pct}%`, String(name)];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-2 text-sm">
        {data.map((entry, i) => {
          const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
          const color =
            STATUS_COLORS[entry.name] ?? FALLBACK_PALETTE[i % FALLBACK_PALETTE.length];
          return (
            <li key={entry.name} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: color }}
                  aria-hidden
                />
                <span className="truncate font-medium">{entry.name}</span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {entry.value}
                <span className="text-xs"> · {pct}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Horizontal bar chart - revenue (and optional confirmed count) by hostel. */
export function HostelRevenueChart({
  rows,
  className,
}: {
  rows: { id: string; name: string; revenue: number; confirmed: number }[];
  className?: string;
}) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No hostels in scope.</p>;
  }

  const data = rows.map((r) => ({
    name: r.name.length > 18 ? `${r.name.slice(0, 16)}…` : r.name,
    fullName: r.name,
    revenue: r.revenue,
    confirmed: r.confirmed,
  }));
  const height = Math.max(220, data.length * 42 + 48);

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" horizontal={false} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
            }
          />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload as { fullName?: string } | undefined;
              return row?.fullName ?? "";
            }}
            formatter={(value, name) => {
              const n = typeof value === "number" ? value : Number(value ?? 0);
              if (name === "revenue") return [ghs(n), "Revenue"];
              return [n, "Confirmed"];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => (value === "revenue" ? "Revenue" : "Confirmed bookings")}
          />
          <Bar dataKey="revenue" fill="#10b981" radius={[0, 6, 6, 0]} barSize={14} />
          <Bar dataKey="confirmed" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

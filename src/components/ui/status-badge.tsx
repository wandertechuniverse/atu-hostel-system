import { cn } from "@/lib/utils";

/**
 * Colored status pill for booking / payment / room statuses.
 * Map is deliberately explicit so no unknown status silently renders as "ok".
 */
const config: Record<string, { label: string; classes: string }> = {
  PENDING: {
    label: "Pending",
    classes: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  CONFIRMED: {
    label: "Confirmed",
    classes:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  CANCELLED: {
    label: "Cancelled",
    classes: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400",
  },
  COMPLETED: {
    label: "Completed",
    classes:
      "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  SUCCESS: {
    label: "Verified",
    classes:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  FAILED: {
    label: "Failed",
    classes: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400",
  },
  AVAILABLE: {
    label: "Available",
    classes:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  MAINTENANCE: {
    label: "Maintenance",
    classes:
      "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  CLOSED: {
    label: "Closed",
    classes: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400",
  },
};

const dotColor: Record<string, string> = {
  PENDING: "bg-amber-500",
  CONFIRMED: "bg-emerald-500",
  CANCELLED: "bg-rose-500",
  COMPLETED: "bg-sky-500",
  SUCCESS: "bg-emerald-500",
  FAILED: "bg-rose-500",
  AVAILABLE: "bg-emerald-500",
  MAINTENANCE: "bg-amber-500",
  CLOSED: "bg-rose-500",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const c = config[status] ?? {
    label: status,
    classes: "border-border bg-muted text-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        c.classes,
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          dotColor[status] ?? "bg-current",
        )}
        aria-hidden
      />
      {c.label}
    </span>
  );
}

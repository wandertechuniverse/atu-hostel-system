"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const INTERVALS = [
  { label: "Off", ms: 0 },
  { label: "15s", ms: 15_000 },
  { label: "30s", ms: 30_000 },
  { label: "60s", ms: 60_000 },
] as const;

/**
 * Live controls for the analytics dashboard: auto-refresh via
 * `router.refresh()` (re-runs the server component) plus manual reload.
 */
export function AnalyticsLiveBar({
  className,
  defaultIntervalMs = 30_000,
}: {
  className?: string;
  defaultIntervalMs?: number;
}) {
  const router = useRouter();
  const [intervalMs, setIntervalMs] = useState(defaultIntervalMs);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [isPending, startTransition] = useTransition();
  const live = intervalMs > 0;

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
      setLastUpdated(new Date());
    });
  }, [router]);

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(refresh, intervalMs);
    return () => window.clearInterval(id);
  }, [live, intervalMs, refresh]);

  // Stamp "now" once after mount so SSR/client times match initially.
  useEffect(() => {
    setLastUpdated(new Date());
  }, []);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border bg-card/60 px-3 py-2 text-sm shadow-xs",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5 font-medium">
        <span
          className={cn(
            "relative flex size-2",
            live && "after:absolute after:inset-0 after:animate-ping after:rounded-full after:bg-emerald-500/60",
          )}
          aria-hidden
        >
          <span
            className={cn(
              "size-2 rounded-full",
              live ? "bg-emerald-500" : "bg-muted-foreground/40",
            )}
          />
        </span>
        {live ? "Live" : "Paused"}
      </span>

      <span className="hidden text-muted-foreground sm:inline">·</span>
      <span className="text-xs text-muted-foreground tabular-nums">
        Updated {lastUpdated.toLocaleTimeString()}
        {isPending ? " · refreshing…" : ""}
      </span>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <div
          className="inline-flex rounded-md border bg-background p-0.5"
          role="group"
          aria-label="Auto-refresh interval"
        >
          {INTERVALS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setIntervalMs(opt.ms)}
              className={cn(
                "rounded px-2 py-1 text-xs font-medium transition-colors",
                intervalMs === opt.ms
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIntervalMs((ms) => (ms > 0 ? 0 : 30_000))}
          aria-label={live ? "Pause live updates" : "Resume live updates"}
        >
          {live ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          <span className="ml-1 hidden sm:inline">{live ? "Pause" : "Resume"}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isPending}
          aria-label="Refresh analytics now"
        >
          <RefreshCw className={cn("size-3.5", isPending && "animate-spin")} />
          <span className="ml-1 hidden sm:inline">Refresh</span>
        </Button>
      </div>
    </div>
  );
}

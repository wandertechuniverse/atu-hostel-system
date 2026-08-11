"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Graceful error fallback (Next.js error.tsx). Shows a calm message and a
 * retry button instead of a stack trace; the real error goes to the console.
 */
export function ErrorFallback({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[hbms] unhandled error:", error);
  }, [error]);

  const detail =
    process.env.NODE_ENV === "development"
      ? error.message
      : error.digest
        ? `Reference: ${error.digest}`
        : null;

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm font-semibold text-primary">Something went wrong</p>
      <h1 className="text-2xl font-bold tracking-tight">
        This page hit an unexpected error
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Your data is safe. Try again - if it keeps happening, contact Group 13.
      </p>
      {detail && (
        <p className="max-w-lg break-all font-mono text-xs text-muted-foreground">
          {detail}
        </p>
      )}
      <Button onClick={() => reset()} className="mt-2">
        Try again
      </Button>
    </main>
  );
}

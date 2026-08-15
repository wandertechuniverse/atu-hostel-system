"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function ManagerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-6 lg:p-8">
      <ErrorFallback error={error} reset={reset} />
    </div>
  );
}

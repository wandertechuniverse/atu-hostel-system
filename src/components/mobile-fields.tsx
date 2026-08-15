import type { ReactNode } from "react";

/**
 * iPhone-safe record card. Do not use dl/dt/dd + CSS grid here: WebKit
 * collapses those and concatenates labels with values on the phone simulator.
 */
export function MobileRecord({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={`space-y-2.5 overflow-visible rounded-lg border p-3 ${className}`}
    >
      {children}
    </article>
  );
}

export function MobileField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm break-words">{children}</div>
    </div>
  );
}

export function MobileFieldRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-x-6 gap-y-2">{children}</div>;
}

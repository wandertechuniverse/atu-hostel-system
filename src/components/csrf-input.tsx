"use client";

import { useSyncExternalStore } from "react";
import { CSRF_COOKIE, CSRF_FIELD } from "@/lib/csrf-constants";

function readCsrfCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CSRF_COOKIE}=`));
  if (!match) return "";
  return decodeURIComponent(match.slice(CSRF_COOKIE.length + 1));
}

/** No-op subscribe: cookie changes are rare and forms remount often enough. */
function subscribe() {
  return () => {};
}

/**
 * Hidden double-submit field. Reads the signed JWT from the `hbms_csrf`
 * cookie set by the proxy. useSyncExternalStore keeps SSR (empty) and
 * client (cookie) from clashing during hydration.
 */
export function CsrfInput() {
  const token = useSyncExternalStore(subscribe, readCsrfCookie, () => "");
  return <input type="hidden" name={CSRF_FIELD} value={token} readOnly />;
}

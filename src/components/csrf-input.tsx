"use client";

import { useCallback, useRef } from "react";
import { CSRF_COOKIE, CSRF_FIELD } from "@/lib/csrf-constants";

/** Read the double-submit CSRF JWT from document.cookie. */
export function readCsrfCookie(): string {
  if (typeof document === "undefined") return "";
  const parts = document.cookie.split("; ");
  for (const part of parts) {
    if (!part.startsWith(`${CSRF_COOKIE}=`)) continue;
    const raw = part.slice(CSRF_COOKIE.length + 1);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return "";
}

/**
 * Hidden double-submit field.
 *
 * The proxy sets `hbms_csrf` on the first navigation, so the cookie is empty
 * during SSR. We fill the input when the field mounts (including sheet/dialog
 * content that appears later) and again on submit.
 */
export function CsrfInput() {
  const cleanupRef = useRef<(() => void) | null>(null);

  const attach = useCallback((el: HTMLInputElement | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (!el) return;

    const apply = () => {
      const token = readCsrfCookie();
      if (token) el.value = token;
    };
    apply();

    const form = el.form;
    if (!form) return;

    form.addEventListener("submit", apply, true);
    const interval = window.setInterval(apply, 500);
    const stop = window.setTimeout(() => window.clearInterval(interval), 5_000);
    cleanupRef.current = () => {
      form.removeEventListener("submit", apply, true);
      window.clearInterval(interval);
      window.clearTimeout(stop);
    };
  }, []);

  return (
    <input
      ref={attach}
      type="hidden"
      name={CSRF_FIELD}
      defaultValue=""
      autoComplete="off"
    />
  );
}

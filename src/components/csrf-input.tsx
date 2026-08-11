"use client";

import { useLayoutEffect, useRef } from "react";
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
 * The proxy sets `hbms_csrf` on the response of the first navigation, so the
 * cookie is not available during SSR (request cookies are still empty). We
 * therefore fill the input on the client — and again on every submit — so
 * Server Actions always receive a non-empty matching token.
 */
export function CsrfInput() {
  const ref = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const apply = () => {
      const token = readCsrfCookie();
      if (ref.current && token) {
        ref.current.value = token;
      }
    };

    apply();

    const form = ref.current?.form;
    if (!form) return;

    // Capture phase so the value is set before the Server Action serializes FormData.
    form.addEventListener("submit", apply, true);
    // Progressive / delayed cookie (proxy Set-Cookie after soft navigations).
    const interval = window.setInterval(apply, 500);
    const stop = window.setTimeout(() => window.clearInterval(interval), 5_000);

    return () => {
      form.removeEventListener("submit", apply, true);
      window.clearInterval(interval);
      window.clearTimeout(stop);
    };
  }, []);

  return (
    <input
      ref={ref}
      type="hidden"
      name={CSRF_FIELD}
      defaultValue=""
      autoComplete="off"
    />
  );
}

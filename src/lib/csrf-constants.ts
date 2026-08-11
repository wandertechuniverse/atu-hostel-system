/**
 * Cookie / form field names shared by server (csrf.ts) and client (CsrfInput).
 * Kept free of `server-only` so client components can import them.
 */
export const CSRF_COOKIE = "hbms_csrf";
export const CSRF_FIELD = "_csrf";

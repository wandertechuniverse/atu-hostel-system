/**
 * Optional HTTP Basic authentication gate for /admin/* (production hardening).
 *
 * Enabled only when both ADMIN_BASIC_USER and ADMIN_BASIC_PASSWORD are set.
 * Local dev and e2e leave them unset so the normal session login is enough.
 */

export function basicAuthEnabled(): boolean {
  return Boolean(
    process.env.ADMIN_BASIC_USER?.trim() &&
      process.env.ADMIN_BASIC_PASSWORD?.trim(),
  );
}

/** Returns true when the Authorization header matches configured credentials. */
export function verifyBasicAuthHeader(header: string | null): boolean {
  if (!basicAuthEnabled()) return true;
  if (!header?.startsWith("Basic ")) return false;

  const user = process.env.ADMIN_BASIC_USER!.trim();
  const pass = process.env.ADMIN_BASIC_PASSWORD!.trim();

  try {
    const decoded = atob(header.slice(6));
    const colon = decoded.indexOf(":");
    if (colon < 0) return false;
    const u = decoded.slice(0, colon);
    const p = decoded.slice(colon + 1);
    return timingSafeEqual(u, user) && timingSafeEqual(p, pass);
  } catch {
    return false;
  }
}

/** Constant-time string compare for short secrets (avoids early-exit leaks). */
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const ab = encoder.encode(a);
  const bb = encoder.encode(b);
  const len = Math.max(ab.length, bb.length);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < len; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

export function basicAuthChallenge(): Response {
  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="HBMS Admin", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

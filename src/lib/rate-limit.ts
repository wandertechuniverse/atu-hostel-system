/**
 * Minimal in-memory sliding-window rate limiter (SECURITY.md §3: login throttled,
 * e.g. 5 attempts per minute per email+IP).
 *
 * Per-instance only: the counter resets on server restart, which is acceptable for
 * the academic demo. A real deployment must use a shared store (see SECURITY.md §8).
 */
const attempts = new Map<string, number[]>();

/** Returns true when the key is still within its limit, and records the attempt. */
export function checkRateLimit(key: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    attempts.set(key, recent);
    return false;
  }

  recent.push(now);
  attempts.set(key, recent);
  return true;
}

/**
 * Clear the window for a key. Call after a successful login so legitimate
 * repeat sign-ins (e.g. log out / log back in) never consume the failure
 * budget - only failed attempts should throttle.
 */
export function resetRateLimit(key: string) {
  attempts.delete(key);
}

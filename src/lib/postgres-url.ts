/**
 * node-pg currently treats sslmode=require/prefer/verify-ca as verify-full
 * and emits a deprecation warning. Prefer the explicit mode so runtime stays
 * quiet and security behavior does not change when pg v9 ships.
 *
 * Also drops `channel_binding=require` when present: it is optional for Neon
 * and has caused multi-second hangs with some node-pg + pooler combinations
 * on high-latency links. TLS itself is unchanged (sslmode=verify-full).
 *
 * @see https://www.postgresql.org/docs/current/libpq-ssl.html
 */
export function normalizePostgresSslMode(url: string): string {
  let next = url;

  // Remove channel_binding=require (and a leftover ? or &).
  if (/[?&]channel_binding=require(?:&|$)/i.test(next)) {
    next = next
      .replace(/([?&])channel_binding=require&?/i, "$1")
      .replace(/[?&]$/, "");
  }

  if (/[?&]sslmode=(require|prefer|verify-ca)(?:&|$)/i.test(next)) {
    return next.replace(
      /([?&]sslmode=)(require|prefer|verify-ca)(?=&|$)/i,
      "$1verify-full",
    );
  }
  if (!/[?&]sslmode=/i.test(next)) {
    return next.includes("?")
      ? `${next}&sslmode=verify-full`
      : `${next}?sslmode=verify-full`;
  }
  return next;
}

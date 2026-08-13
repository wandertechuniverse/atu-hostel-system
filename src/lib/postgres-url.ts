/**
 * node-pg currently treats sslmode=require/prefer/verify-ca as verify-full
 * and emits a deprecation warning. Prefer the explicit mode so runtime stays
 * quiet and security behavior does not change when pg v9 ships.
 *
 * @see https://www.postgresql.org/docs/current/libpq-ssl.html
 */
export function normalizePostgresSslMode(url: string): string {
  if (/[?&]sslmode=(require|prefer|verify-ca)(?:&|$)/i.test(url)) {
    return url.replace(
      /([?&]sslmode=)(require|prefer|verify-ca)(?=&|$)/i,
      "$1verify-full",
    );
  }
  if (!/[?&]sslmode=/i.test(url)) {
    return url.includes("?")
      ? `${url}&sslmode=verify-full`
      : `${url}?sslmode=verify-full`;
  }
  return url;
}

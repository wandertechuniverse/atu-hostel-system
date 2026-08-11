import { SignJWT, jwtVerify } from "jose";
import { CSRF_COOKIE, CSRF_FIELD } from "@/lib/csrf-constants";

export { CSRF_COOKIE, CSRF_FIELD };

export const CSRF_TTL = "2h";

function secretBytes(secret: string) {
  return new TextEncoder().encode(secret);
}

/** Pure: mint a signed CSRF JWT (testable without cookies / Next runtime). */
export async function signCsrfToken(
  secret = process.env.SESSION_SECRET ?? "dev-only-secret-change-me",
  jti = crypto.randomUUID(),
): Promise<string> {
  return new SignJWT({ purpose: "csrf" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(CSRF_TTL)
    .setJti(jti)
    .sign(secretBytes(secret));
}

/** Pure: verify signature + purpose claim. Returns false on any failure. */
export async function verifyCsrfToken(
  token: string,
  secret = process.env.SESSION_SECRET ?? "dev-only-secret-change-me",
): Promise<boolean> {
  if (!token || token.length > 2048) return false;
  try {
    const { payload } = await jwtVerify(token, secretBytes(secret));
    return payload.purpose === "csrf";
  } catch {
    return false;
  }
}

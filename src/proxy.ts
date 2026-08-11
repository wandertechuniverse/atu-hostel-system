import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { SignJWT, jwtVerify } from "jose";
import {
  sessionOptions,
  isStaffRole,
  type SessionData,
} from "@/lib/session";
import {
  basicAuthChallenge,
  basicAuthEnabled,
  verifyBasicAuthHeader,
} from "@/lib/basic-auth";
import { CSRF_COOKIE } from "@/lib/csrf-constants";

/**
 * Next.js 16 renamed middleware.ts → proxy.ts.
 * Coarse front door: optional Basic auth on /admin, staff session gate,
 * and seeding of the signed JWT CSRF cookie for double-submit protection.
 * Authoritative role/scope checks still run server-side in each page/action.
 */

const CSRF_MAX_AGE = 60 * 60 * 2; // 2 hours

function secretKey(): Uint8Array {
  return new TextEncoder().encode(
    process.env.SESSION_SECRET ?? "dev-only-secret-change-me",
  );
}

async function mintCsrfJwt(): Promise<string> {
  return new SignJWT({ purpose: "csrf" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CSRF_MAX_AGE}s`)
    .setJti(crypto.randomUUID())
    .sign(secretKey());
}

async function csrfJwtValid(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.purpose === "csrf";
  } catch {
    return false;
  }
}

function setCsrfCookie(response: NextResponse, token: string) {
  // Not httpOnly: client forms must double-submit the same value.
  // Secure only on HTTPS so local http://localhost still works.
  response.cookies.set({
    name: CSRF_COOKIE,
    value: token,
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CSRF_MAX_AGE,
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Optional second factor for the entire admin surface (env-gated).
  if (pathname.startsWith("/admin") && basicAuthEnabled()) {
    if (!verifyBasicAuthHeader(request.headers.get("authorization"))) {
      return basicAuthChallenge();
    }
  }

  const response = NextResponse.next();

  // Seed / refresh signed JWT CSRF cookie when missing or invalid.
  const existing = request.cookies.get(CSRF_COOKIE)?.value;
  if (!existing || !(await csrfJwtValid(existing))) {
    setCsrfCookie(response, await mintCsrfJwt());
  }

  // Staff session gate for /admin (role re-checked on every page/action).
  if (pathname.startsWith("/admin")) {
    const session = await getIronSession<SessionData>(
      request,
      response,
      sessionOptions,
    );
    if (!(session.isLoggedIn && isStaffRole(session.role))) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      const redirect = NextResponse.redirect(loginUrl);
      const csrf = response.cookies.get(CSRF_COOKIE);
      if (csrf) {
        redirect.cookies.set(CSRF_COOKIE, csrf.value, {
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: CSRF_MAX_AGE,
        });
      }
      return redirect;
    }
  }

  return response;
}

export const config = {
  // All HTML routes that host forms need the CSRF cookie; skip static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

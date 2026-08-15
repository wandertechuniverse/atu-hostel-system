import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { SignJWT, jwtVerify } from "jose";
import {
  sessionOptions,
  isStaffRole,
  resolveSessionSecret,
  type SessionData,
} from "@/lib/session";
import {
  isSharedStaffSection,
  staffSection,
  swapStaffPrefix,
} from "@/lib/paths";
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
    resolveSessionSecret(),
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

  const isStaffPath =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/manager" ||
    pathname.startsWith("/manager/");

  // Optional second factor for the staff surfaces (env-gated).
  if (isStaffPath && basicAuthEnabled()) {
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

  // Staff session gate for /admin and /manager (role re-checked on every page).
  if (isStaffPath) {
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

    const search = request.nextUrl.search;
    if (session.role === "MANAGER" && pathname.startsWith("/admin")) {
      const section = staffSection(pathname);
      const dest = isSharedStaffSection(section)
        ? `${swapStaffPrefix(pathname, "/manager")}${search}`
        : `/manager${search}`;
      return NextResponse.redirect(new URL(dest, request.url));
    }
    if (session.role === "ADMIN" && pathname.startsWith("/manager")) {
      return NextResponse.redirect(
        new URL(`${swapStaffPrefix(pathname, "/admin")}${search}`, request.url),
      );
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

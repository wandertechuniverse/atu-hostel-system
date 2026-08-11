import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  getSession,
  homeForRole,
  verifyCredentials,
} from "@/lib/auth";
import { audit } from "@/lib/audit";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import {
  buildResetUrl,
  generateResetToken,
  hashResetToken,
  isTokenExpired,
  RESET_TOKEN_TTL_MS,
} from "@/lib/password-reset";
import { mailerFor, showResetLinkInResponse } from "@/lib/mailer";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "@/lib/validation";
import type { SessionData } from "@/lib/session";
import {
  AppError,
  conflictError,
  rateLimitedError,
  unauthenticatedError,
  validationError,
} from "./errors";

/**
 * Shared authentication logic used by BOTH the server actions (form UI) and the
 * REST API (docs/11-api.md). The session cookie is set here so the two entry
 * points behave identically - the only difference is what happens after:
 * the action redirects, the route returns JSON.
 */

/** Fields safe to expose over JSON / render - never the password hash. */
export function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  phone: string;
  studentIdNumber: string | null;
  department: string | null;
  role: "STUDENT" | "MANAGER" | "ADMIN";
  isActive: boolean;
  hostelId: string | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    studentIdNumber: user.studentIdNumber,
    department: user.department,
    role: user.role,
    isActive: user.isActive,
    hostelId: user.hostelId,
  };
}

export async function loginUser(input: { email: unknown; password: unknown }, ip: string) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  // Serverless cold starts may boot an empty /tmp DB — plant demo accounts.
  const { ensureDemoData } = await import("@/lib/ensure-demo-data");
  try {
    await ensureDemoData();
  } catch (error) {
    console.error("[login] ensureDemoData failed:", error);
  }

  const email = parsed.data.email.trim().toLowerCase();

  // Throttle per email+IP: 5 failed attempts per minute (SECURITY.md §3).
  const key = `login:${email}|${ip}`;
  if (!checkRateLimit(key)) {
    await audit({ action: "auth.rate_limited", subjectType: "User", ipAddress: ip });
    throw rateLimitedError("Too many login attempts. Please wait a minute and try again.");
  }

  const user = await verifyCredentials(email, parsed.data.password);
  if (!user) {
    await audit({ action: "auth.login_failed", subjectType: "User", ipAddress: ip });
    throw unauthenticatedError("Invalid email or password");
  }

  // Only failed attempts consume the budget - success resets the window.
  resetRateLimit(key);
  await audit({ action: "auth.login", userId: user.id, ipAddress: ip });
  await createSession({ id: user.id, role: user.role, hostelId: user.hostelId });
  return { user: toPublicUser(user), home: homeForRole(user.role) };
}

export async function registerUser(input: {
  name: unknown;
  email: unknown;
  studentIdNumber: unknown;
  phone: unknown;
  password: unknown;
}) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const name = parsed.data.name;
  const email = parsed.data.email.trim().toLowerCase();
  const phone = parsed.data.phone;
  const password = parsed.data.password;
  const studentIdNumber = parsed.data.studentIdNumber?.trim() || null;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw conflictError("An account with that email already exists");

  const user = await db.user.create({
    data: {
      name,
      email,
      phone,
      studentIdNumber,
      role: "STUDENT", // never taken from the client
      password: await bcrypt.hash(password, 12),
    },
  });

  await audit({ action: "user.registered", userId: user.id });
  await createSession({ id: user.id, role: "STUDENT", hostelId: null });
  return { user: toPublicUser(user) };
}

export async function logoutUser() {
  const session = await getSession();
  if (session?.userId) {
    await audit({ action: "auth.logout", userId: session.userId });
  }
  await destroySession();
}

/** The session's own record (DB-validated), for GET /api/auth/me. */
export async function currentUser(sessionUserId: string) {
  const user = await db.user.findUnique({ where: { id: sessionUserId } });
  if (!user) throw new AppError("UNAUTHENTICATED", "Account no longer exists.");
  return toPublicUser(user);
}

/**
 * Self-service password change (FR-9): the caller must prove knowledge of the
 * CURRENT password before the new one is accepted. The confirm field is
 * checked server-side (never only in the client). Audits auth.password_changed
 * with the user as subject. Works for any signed-in role.
 */
export async function changeOwnPassword(
  session: { userId?: string },
  input: {
    currentPassword: unknown;
    newPassword: unknown;
    confirmPassword: unknown;
  },
) {
  if (!session.userId) throw unauthenticatedError();

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, password: true },
  });
  if (!user) throw unauthenticatedError("Account no longer exists.");

  const currentOk = await bcrypt.compare(
    parsed.data.currentPassword,
    user.password,
  );
  if (!currentOk) {
    throw validationError("Current password is incorrect");
  }

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(parsed.data.newPassword, 12) },
    });
    await tx.activityLog.create({
      data: {
        action: "auth.password_changed",
        userId: user.id,
        subjectType: "User",
        subjectId: user.id,
      },
    });
  });

  return { ok: true };
}

/**
 * Self-service profile update (FR-9). Role, email and isActive are never
 * taken from the client — only name, phone, department and student ID.
 */
export async function updateOwnProfile(
  session: SessionData,
  input: {
    name: unknown;
    phone: unknown;
    department: unknown;
    studentIdNumber: unknown;
  },
) {
  if (!session.userId) throw unauthenticatedError();

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const data = {
    name: parsed.data.name,
    phone: parsed.data.phone,
    department: parsed.data.department?.trim()
      ? parsed.data.department.trim()
      : null,
    studentIdNumber:
      session.role === "STUDENT"
        ? parsed.data.studentIdNumber?.trim()
          ? parsed.data.studentIdNumber.trim()
          : null
        : undefined,
  };

  // Unique student ID collision
  if (data.studentIdNumber) {
    const clash = await db.user.findFirst({
      where: {
        studentIdNumber: data.studentIdNumber,
        NOT: { id: session.userId },
      },
      select: { id: true },
    });
    if (clash) {
      throw validationError("That student ID is already registered.");
    }
  }

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.userId! },
      data: {
        name: data.name,
        phone: data.phone,
        department: data.department,
        ...(data.studentIdNumber !== undefined
          ? { studentIdNumber: data.studentIdNumber }
          : {}),
      },
    });
    await tx.activityLog.create({
      data: {
        action: "user.profile_updated",
        userId: session.userId!,
        subjectType: "User",
        subjectId: session.userId!,
      },
    });
  });

  return { ok: true };
}

/**
 * Forgot-password step 1: issue a single-use reset token and "email" it
 * (console mailer; the link is also returned for display in dev mode). The
 * response is identical whether or not the account exists, so the endpoint
 * cannot be used to enumerate users. Throttled per email+IP (SECURITY.md §3).
 * Returns { devResetUrl } only in development and only for a real account.
 */
export async function requestPasswordReset(
  input: { email: unknown },
  ip: string,
  origin: string,
) {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const email = parsed.data.email.toLowerCase();
  const key = `reset:${email}|${ip}`;
  if (!checkRateLimit(key)) {
    await audit({ action: "auth.rate_limited", ipAddress: ip });
    throw rateLimitedError(
      "Too many reset requests. Please wait a minute and try again.",
    );
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  // Same outcome either way - no user enumeration.
  let devResetUrl: string | undefined;
  if (user) {
    const token = generateResetToken();
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const resetUrl = buildResetUrl(origin, token);
    await mailerFor().sendPasswordReset(user.email, resetUrl);
    if (showResetLinkInResponse()) devResetUrl = resetUrl;

    await audit({
      action: "auth.password_reset_requested",
      userId: user.id,
      subjectType: "User",
      subjectId: user.id,
      ipAddress: ip,
    });
  }

  return { devResetUrl };
}

/**
 * Forgot-password step 2: redeem the token. The stored SHA-256 hash is
 * matched, so a DB leak cannot be replayed; expired or unknown tokens get a
 * generic message; success deletes the token (single use) and re-hashes the
 * password at the same cost as registration. Audits auth.password_reset, or
 * auth.password_reset_failed on a bad/expired attempt.
 */
export async function resetPassword(input: {
  token: unknown;
  newPassword: unknown;
  confirmPassword: unknown;
}, ip: string) {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const tokenHash = hashResetToken(parsed.data.token);
  const key = `reset-token:${tokenHash}|${ip}`;
  if (!checkRateLimit(key)) {
    await audit({ action: "auth.rate_limited", ipAddress: ip });
    throw rateLimitedError(
      "Too many reset attempts. Please wait a minute and try again.",
    );
  }

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true } } },
  });
  if (!record || isTokenExpired(record.expiresAt)) {
    await audit({ action: "auth.password_reset_failed", ipAddress: ip });
    throw validationError("This reset link is invalid or has expired.");
  }

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: record.user.id },
      data: { password: await bcrypt.hash(parsed.data.newPassword, 12) },
    });
    // Single use - the token dies with the reset.
    await tx.passwordResetToken.delete({ where: { id: record.id } });
    await tx.activityLog.create({
      data: {
        action: "auth.password_reset",
        userId: record.user.id,
        subjectType: "User",
        subjectId: record.user.id,
        ipAddress: ip,
      },
    });
  });

  return { ok: true };
}

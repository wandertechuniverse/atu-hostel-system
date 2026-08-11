import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import type { SessionData } from "@/lib/session";
import { adminCreateUserSchema, adminUpdateUserSchema } from "@/lib/validation";
import { conflictError, notFoundError, validationError } from "./errors";

/**
 * Shared user-administration operations (PRD stories A2, A4, A6), used by both
 * the admin server actions and the REST API. Callers guard on ADMIN.
 */

export async function listUsers() {
  return db.user.findMany({
    include: { hostel: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Admin-created account (students self-register; staff are always created by
 * an administrator - the role can never be self-asserted). Unique email and
 * student ID are enforced; the password is bcrypt-hashed at the same cost as
 * self-registration. Audits user.created.
 */
export async function createUser(
  session: SessionData,
  input: {
    name: unknown;
    email: unknown;
    studentIdNumber: unknown;
    phone: unknown;
    role: unknown;
    password: unknown;
  },
) {
  const parsed = adminCreateUserSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const name = parsed.data.name;
  const email = parsed.data.email.trim().toLowerCase();
  const phone = parsed.data.phone;
  const role = parsed.data.role;
  const password = parsed.data.password;
  const studentIdNumber = parsed.data.studentIdNumber?.trim() || null;

  const emailTaken = await db.user.findUnique({ where: { email } });
  if (emailTaken) throw conflictError("An account with that email already exists");
  if (studentIdNumber) {
    const idTaken = await db.user.findUnique({ where: { studentIdNumber } });
    if (idTaken) throw conflictError("Another account already uses that student ID");
  }

  const user = await db.user.create({
    data: {
      name,
      email,
      phone,
      studentIdNumber,
      role,
      password: await bcrypt.hash(password, 12),
    },
  });

  await audit({
    action: "user.created",
    userId: session.userId!,
    subjectType: "User",
    subjectId: user.id,
  });

  return db.user.findUnique({
    where: { id: user.id },
    include: { hostel: { select: { id: true, name: true } } },
  });
}

/**
 * Hard-delete an account (completes the user lifecycle: create → edit →
 * activate/deactivate → delete). The booking-history guard refuses to remove
 * a user whose bookings must survive: bookings and payments reference the
 * user, so deletion would orphan them - deactivate instead. Also blocked:
 * deleting your own account. A manager who is deleted is first unassigned
 * (their hostel becomes managerless, visible on the hostels page); the user's
 * audit-log rows keep their content but lose the actor link (the same
 * fallback the audit module uses for deleted actors). Audits user.deleted.
 */
export async function deleteUser(session: SessionData, userId: string) {
  if (!userId) throw validationError("Missing user id.");
  if (userId === session.userId) {
    throw conflictError("You cannot delete your own account.");
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      hostelId: true,
      _count: { select: { bookings: true } },
    },
  });
  if (!user) throw notFoundError("User not found.");

  const bookingCount = user._count.bookings;
  if (bookingCount > 0) {
    throw conflictError(
      `${user.name} has ${bookingCount} booking${bookingCount === 1 ? "" : "s"} on record. Deactivate the account instead to preserve the booking history.`,
    );
  }

  await db.$transaction(async (tx) => {
    // Keep the audit trail: drop the actor link, never the rows themselves.
    await tx.activityLog.updateMany({
      where: { userId: user.id },
      data: { userId: null },
    });
    // A deleted manager must not leave a dangling assignment.
    if (user.hostelId) {
      await tx.user.update({
        where: { id: user.id },
        data: { hostelId: null },
      });
    }
    await tx.user.delete({ where: { id: user.id } });
    await tx.activityLog.create({
      data: {
        action: "user.deleted",
        userId: session.userId!,
        subjectType: "User",
        subjectId: user.id,
      },
    });
  });

  return { deletedId: user.id, name: user.name };
}

export async function toggleUserStatus(session: SessionData, userId: string) {
  if (!userId) throw validationError("Missing user id.");
  if (userId === session.userId) {
    throw conflictError("You cannot deactivate your own account.");
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, isActive: true },
  });
  if (!user) throw notFoundError("User not found.");

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { isActive: !user.isActive },
    });
    await tx.activityLog.create({
      data: {
        action: user.isActive ? "user.deactivated" : "user.activated",
        userId: session.userId!,
        subjectType: "User",
        subjectId: user.id,
      },
    });
  });
  return { userId: user.id, isActive: !user.isActive };
}

/**
 * Idempotent desired-state variant for the REST API (PATCH /api/users/:id).
 * No-op when the user is already in the requested state; delegates to the
 * toggle otherwise.
 */
export async function setUserActive(
  session: SessionData,
  userId: string,
  desired: boolean,
) {
  const current = await db.user.findUnique({
    where: { id: userId },
    select: { isActive: true },
  });
  if (!current) throw notFoundError("User not found.");
  if (current.isActive === desired) return { userId, isActive: desired };
  await toggleUserStatus(session, userId);
  return { userId, isActive: desired };
}

/**
 * Assign (or unassign) a hostel to a user, making them its manager.
 * One manager per hostel (User.hostelId unique); assigning promotes a student,
 * unassigning a manager demotes them; admins are never demoted.
 */
export async function assignManager(
  session: SessionData,
  userId: string,
  hostelId: string | null,
) {
  if (!userId) throw validationError("Missing user id.");

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, hostelId: true },
  });
  if (!user) throw notFoundError("User not found.");

  if (hostelId) {
    const hostel = await db.hostel.findUnique({
      where: { id: hostelId },
      include: { manager: { select: { id: true } } },
    });
    if (!hostel) throw notFoundError("Hostel not found.");
    if (hostel.manager && hostel.manager.id !== userId) {
      throw conflictError(`${hostel.name} already has a manager.`);
    }
  }

  const role =
    hostelId !== null
      ? user.role === "ADMIN"
        ? "ADMIN"
        : "MANAGER"
      : user.role === "MANAGER"
        ? "STUDENT"
        : user.role;

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { hostelId, role },
    });
    await tx.activityLog.create({
      data: {
        action: hostelId ? "user.assigned_manager" : "user.manager_unassigned",
        userId: session.userId!,
        subjectType: "User",
        subjectId: user.id,
      },
    });
  });

  return db.user.findUnique({
    where: { id: user.id },
    include: { hostel: { select: { id: true, name: true } } },
  });
}

/**
 * Admin edit of a user's profile fields, with an optional password reset.
 * Role and hostelId are never accepted here (role changes happen through
 * hostel assignment; isActive through its own toggle). A blank password keeps
 * the current hash. Audit records user.updated, or user.password_reset when
 * the password changed (visible in the /admin/activity viewer).
 */
export async function updateUser(
  session: SessionData,
  userId: string,
  input: {
    name: unknown;
    email: unknown;
    phone: unknown;
    studentIdNumber: unknown;
    department: unknown;
    password: unknown;
  },
) {
  if (!userId) throw validationError("Missing user id.");

  const parsed = adminUpdateUserSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) throw notFoundError("User not found.");

  const { name, email, phone, password } = parsed.data;
  const studentIdNumber = parsed.data.studentIdNumber?.trim() || null;
  const department = parsed.data.department?.trim() || null;

  // Unique fields - exclude the user being edited.
  const emailTaken = await db.user.findUnique({ where: { email } });
  if (emailTaken && emailTaken.id !== userId) {
    throw conflictError("Another account already uses that email.");
  }
  if (studentIdNumber) {
    const idTaken = await db.user.findUnique({
      where: { studentIdNumber },
    });
    if (idTaken && idTaken.id !== userId) {
      throw conflictError("Another account already uses that student ID.");
    }
  }

  const changedPassword = Boolean(password?.trim());

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        phone,
        studentIdNumber,
        department,
        ...(changedPassword
          ? { password: await bcrypt.hash(password!.trim(), 12) }
          : {}),
      },
    });
    await tx.activityLog.create({
      data: {
        action: changedPassword ? "user.password_reset" : "user.updated",
        userId: session.userId!,
        subjectType: "User",
        subjectId: userId,
      },
    });
  });

  return db.user.findUnique({
    where: { id: userId },
    include: { hostel: { select: { id: true, name: true } } },
  });
}

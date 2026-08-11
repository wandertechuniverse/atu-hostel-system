"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { errorMessage } from "@/lib/services/errors";
import {
  assignManager,
  createUser,
  deleteUser,
  toggleUserStatus,
  updateUser,
} from "@/lib/services/users";

export type UsersFormState = { ok?: boolean; error?: string };

async function guardCsrf(formData: FormData): Promise<UsersFormState | null> {
  try {
    await requireCsrf(formData);
    return null;
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

/**
 * Admin-created account - students, managers and sub-admins. The role comes
 * from this ADMIN-only action (never from an anonymous client). A manager
 * created this way has no hostel until one is assigned.
 */
export async function createUserAction(
  _prev: UsersFormState,
  formData: FormData,
): Promise<UsersFormState> {
  const csrf = await guardCsrf(formData);
  if (csrf) return csrf;
  const session = await requireRole("ADMIN");
  try {
    await createUser(session, {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      studentIdNumber: String(formData.get("studentIdNumber") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      role: String(formData.get("role") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

/**
 * Hard-delete an account (completes the user lifecycle). Administrators
 * only. The booking-history guard refuses users with bookings on record
 * (deactivate instead); self-deletion is blocked server-side.
 */
export async function deleteUserAction(
  _prev: UsersFormState,
  formData: FormData,
): Promise<UsersFormState> {
  const csrf = await guardCsrf(formData);
  if (csrf) return csrf;
  const session = await requireRole("ADMIN");
  try {
    await deleteUser(session, String(formData.get("userId") ?? ""));
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

/**
 * Activate / deactivate an account (PRD story A6). Administrators only.
 * Self-deactivation is blocked server-side.
 */
export async function toggleUserStatusAction(
  _prev: UsersFormState,
  formData: FormData,
): Promise<UsersFormState> {
  const csrf = await guardCsrf(formData);
  if (csrf) return csrf;
  const session = await requireRole("ADMIN");
  try {
    await toggleUserStatus(session, String(formData.get("userId") ?? ""));
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

/**
 * Assign (or unassign) a hostel to a user - making them that hostel's manager
 * (PRD stories A2, M1). Administrators only; one manager per hostel.
 */
export async function assignManagerAction(
  _prev: UsersFormState,
  formData: FormData,
): Promise<UsersFormState> {
  const csrf = await guardCsrf(formData);
  if (csrf) return csrf;
  const session = await requireRole("ADMIN");
  const hostelIdRaw = String(formData.get("hostelId") ?? "").trim();
  try {
    await assignManager(
      session,
      String(formData.get("userId") ?? ""),
      hostelIdRaw || null,
    );
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/hostels");
  return { ok: true };
}

/**
 * Admin edit of a user's profile fields + optional password reset.
 * Administrators only; role and hostelId are never accepted from the client.
 */
export async function updateUserAction(
  _prev: UsersFormState,
  formData: FormData,
): Promise<UsersFormState> {
  const csrf = await guardCsrf(formData);
  if (csrf) return csrf;
  const session = await requireRole("ADMIN");
  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");
  try {
    await updateUser(session, userId, {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      studentIdNumber: String(formData.get("studentIdNumber") ?? ""),
      department: String(formData.get("department") ?? ""),
      password: password.trim() === "" ? null : password,
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

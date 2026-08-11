"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { errorMessage } from "@/lib/services/errors";
import { approveBooking, rejectBooking, verifyPayment } from "@/lib/services/bookings";
import { toggleHostelApproval } from "@/lib/services/hostels";

export type AdminActionResult = { ok?: boolean; error?: string };

/**
 * Combined row action for /admin/bookings (useActionState form).
 * Reads `bookingId` + `intent`; the service re-checks role + ownership.
 */
export async function bookingAdminAction(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    await requireCsrf(formData);
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
  const session = await requireRole("MANAGER", "ADMIN");
  const bookingId = String(formData.get("bookingId") ?? "");
  const intent = String(formData.get("intent") ?? "");

  try {
    if (intent === "approve") await approveBooking(session, bookingId);
    else if (intent === "reject") await rejectBooking(session, bookingId);
    else if (intent === "verify") await verifyPayment(session, bookingId);
    else return { ok: false, error: "Unknown action." };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  return { ok: true };
}

/** Form action for /admin/payments (useActionState form). */
export async function verifyPaymentFormAction(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    await requireCsrf(formData);
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
  const session = await requireRole("MANAGER", "ADMIN");
  try {
    await verifyPayment(session, String(formData.get("bookingId") ?? ""));
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }

  revalidatePath("/admin/payments");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  return { ok: true };
}

/** Form action for /admin/hostels - publish/unpublish toggle (admin only). */
export async function toggleHostelApprovalFormAction(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    await requireCsrf(formData);
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
  const session = await requireRole("ADMIN");
  try {
    await toggleHostelApproval(session, String(formData.get("hostelId") ?? ""));
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }

  revalidatePath("/admin/hostels");
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

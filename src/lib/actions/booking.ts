"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { errorMessage } from "@/lib/services/errors";
import { createBooking, submitPayment } from "@/lib/services/bookings";

export type BookingFormState = { error?: string };
export type PaymentFormState = { ok?: boolean; error?: string };

export async function createBookingAction(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  try {
    await requireCsrf(formData);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  const session = await requireSession();
  try {
    await createBooking(session, {
      roomId: formData.get("roomId"),
      academicSession: formData.get("academicSession"),
      notes: formData.get("notes"),
      acceptRules: formData.get("acceptRules"),
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }
  redirect("/my-bookings?submitted=1");
}

/**
 * Student submits a simulated Mobile Money payment for an approved booking.
 * Students only; the amount always comes from the booking record.
 */
export async function submitPaymentAction(
  _prev: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  try {
    await requireCsrf(formData);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  const session = await requireSession();
  if (session.role !== "STUDENT") {
    return { error: "Only students can submit payments." };
  }
  try {
    await submitPayment(session, String(formData.get("bookingId") ?? ""), {
      provider: formData.get("provider"),
      phone: formData.get("phone"),
      reference: formData.get("reference"),
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/my-bookings");
  return { ok: true };
}

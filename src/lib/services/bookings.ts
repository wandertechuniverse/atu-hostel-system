import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { bookingScopeWhere, paymentScopeWhere, canManageHostel } from "@/lib/scoping";
import { isRoomFull } from "@/lib/availability";
import { paymentSubmissionSchema } from "@/lib/validation";
import type { SessionData } from "@/lib/session";
import {
  conflictError,
  forbiddenError,
  notFoundError,
  validationError,
} from "./errors";

/**
 * Shared booking + payment operations (docs/09-build-prompts.md Prompt 4,
 * docs/05-payment-flow.md). Used by both the server actions and the REST API.
 *
 * Availability is always derived inside a transaction: confirmed bookings are
 * counted against capacity atomically - never stored as a column.
 */

/* ------------------------------- reads ---------------------------------- */

/** Staff: scoped to their hostel(s). Students: their own requests only. */
export async function listBookings(session: SessionData) {
  return db.booking.findMany({
    where:
      session.role === "STUDENT"
        ? { userId: session.userId }
        : bookingScopeWhere(session),
    include: {
      user: { select: { id: true, name: true, studentIdNumber: true, email: true } },
      room: {
        select: {
          id: true,
          roomNumber: true,
          roomType: true,
          hostel: { select: { id: true, name: true } },
        },
      },
      payment: { select: { id: true, reference: true, status: true, method: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listPayments(session: SessionData) {
  return db.payment.findMany({
    where:
      session.role === "STUDENT"
        ? { booking: { userId: session.userId } }
        : paymentScopeWhere(session),
    include: {
      booking: {
        select: {
          id: true,
          amount: true,
          user: { select: { id: true, name: true } },
          room: {
            select: {
              roomNumber: true,
              hostel: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { paymentDate: "desc" },
  });
}

/* ------------------------------ mutations ------------------------------- */

export async function createBooking(session: SessionData, roomId: string) {
  if (session.role !== "STUDENT") {
    throw forbiddenError("Only students can book rooms.");
  }
  if (!roomId) throw validationError("Invalid room selection");

  await db.$transaction(async (tx) => {
    const room = await tx.room.findUnique({ where: { id: roomId } });
    if (!room) throw notFoundError("Room not found");
    if (room.status !== "AVAILABLE") throw conflictError("Room is not available");

    const confirmed = await tx.booking.count({
      where: { roomId: room.id, status: "CONFIRMED" },
    });
    if (isRoomFull(room.capacity, confirmed)) throw conflictError("This room is full");

    await tx.booking.create({
      data: {
        userId: session.userId!,
        roomId: room.id,
        amount: room.pricePerSemester, // snapshotted, never from the client
        academicSession: "2026/2027",
        status: "PENDING",
      },
    });
    await tx.activityLog.create({
      data: { action: "booking.created", userId: session.userId! },
    });
  });

  return db.booking.findFirst({
    where: { userId: session.userId! },
    orderBy: { createdAt: "desc" },
    include: {
      room: {
        select: {
          id: true,
          roomNumber: true,
          roomType: true,
          hostel: { select: { id: true, name: true } },
        },
      },
    },
  });
}

/** Approve a booking request; capacity is re-checked atomically. */
export async function approveBooking(session: SessionData, bookingId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { room: { select: { id: true, hostelId: true, capacity: true } } },
  });
  if (!booking) throw notFoundError("Booking not found.");
  if (!canManageHostel(session, booking.room.hostelId)) throw forbiddenError();
  if (booking.status === "CONFIRMED") throw conflictError("This booking is already confirmed.");
  if (booking.status === "CANCELLED") {
    throw conflictError("A cancelled booking cannot be approved.");
  }

  await db.$transaction(async (tx) => {
    const confirmed = await tx.booking.count({
      where: { roomId: booking.room.id, status: "CONFIRMED" },
    });
    if (confirmed >= booking.room.capacity) {
      throw conflictError("This room has reached capacity.");
    }
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED" },
    });
    await tx.activityLog.create({
      data: {
        action: "booking.approved",
        userId: session.userId!,
        subjectType: "Booking",
        subjectId: bookingId,
      },
    });
  });
  return db.booking.findUnique({ where: { id: bookingId } });
}

export async function rejectBooking(session: SessionData, bookingId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { room: { select: { hostelId: true } } },
  });
  if (!booking) throw notFoundError("Booking not found.");
  if (!canManageHostel(session, booking.room.hostelId)) throw forbiddenError();
  if (booking.status === "CONFIRMED") {
    throw conflictError("A confirmed booking cannot be rejected - cancel it instead.");
  }
  if (booking.status === "CANCELLED") {
    throw conflictError("This booking is already cancelled.");
  }

  await db.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    });
    await tx.activityLog.create({
      data: {
        action: "booking.rejected",
        userId: session.userId!,
        subjectType: "Booking",
        subjectId: bookingId,
      },
    });
  });
  return db.booking.findUnique({ where: { id: bookingId } });
}

/**
 * Mark a booking's accommodation payment as verified. The amount is taken from
 * the booking record - never from the request (docs/05-payment-flow.md §7).
 */
export async function verifyPayment(session: SessionData, bookingId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { room: { select: { hostelId: true } }, payment: true },
  });
  if (!booking) throw notFoundError("Booking not found.");
  if (!canManageHostel(session, booking.room.hostelId)) throw forbiddenError();
  if (booking.payment?.status === "SUCCESS") {
    throw conflictError("Payment for this booking is already verified.");
  }

  await db.$transaction(async (tx) => {
    const reference = `PAY-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    await tx.payment.upsert({
      where: { bookingId },
      create: {
        bookingId,
        reference,
        amountPaid: booking.amount, // snapshotted from the booking, never the client
        status: "SUCCESS",
        method: "mock",
        paymentDate: new Date(),
      },
      // A student-submitted payment (docs/05-payment-flow.md §7) keeps its
      // own reference and provider - verification only confirms it.
      update: {
        amountPaid: booking.amount,
        status: "SUCCESS",
        paymentDate: new Date(),
      },
    });
    await tx.activityLog.create({
      data: {
        action: "payment.verified",
        userId: session.userId!,
        subjectType: "Booking",
        subjectId: bookingId,
      },
    });
  });
  return db.payment.findUnique({ where: { bookingId } });
}

/**
 * Student submits a simulated Mobile Money payment for an approved booking
 * (docs/05-payment-flow.md §7). The amount is snapshotted from the booking -
 * never from the client - and the payment stays PENDING until a manager or
 * admin verifies it.
 */
export async function submitPayment(
  session: SessionData,
  bookingId: string,
  input: { provider: unknown; phone: unknown; reference: unknown },
) {
  if (!bookingId) throw validationError("Missing booking id.");

  const parsed = paymentSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(
      parsed.error.issues[0]?.message ?? "Invalid payment details",
    );
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });
  if (!booking) throw notFoundError("Booking not found.");
  // A student may only pay for their own booking.
  if (booking.userId !== session.userId) throw forbiddenError();
  if (booking.status !== "CONFIRMED") {
    throw conflictError("Payment is only accepted after the booking is approved.");
  }
  if (booking.payment?.status === "SUCCESS") {
    throw conflictError("This booking is already paid.");
  }

  const gatewayResponse = JSON.stringify({
    provider: parsed.data.provider,
    phone: parsed.data.phone,
    status: "pending",
  });

  await db.$transaction(async (tx) => {
    await tx.payment.upsert({
      where: { bookingId },
      create: {
        bookingId,
        reference: parsed.data.reference,
        amountPaid: booking.amount,
        method: parsed.data.provider,
        gatewayResponse,
      },
      update: {
        reference: parsed.data.reference,
        amountPaid: booking.amount,
        method: parsed.data.provider,
        gatewayResponse,
      },
    });
    await tx.activityLog.create({
      data: {
        action: "payment.submitted",
        userId: session.userId!,
        subjectType: "Booking",
        subjectId: bookingId,
      },
    });
  });

  return db.payment.findUnique({ where: { bookingId } });
}

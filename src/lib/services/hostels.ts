import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { hostelSchema, roomSchema } from "@/lib/validation";
import { hostelScopeWhere, canManageHostel, isManager } from "@/lib/scoping";
import { availableBeds } from "@/lib/availability";
import {
  buildImageFilename,
  imageExtensionFor,
  isWithinImageSizeLimit,
  shouldRemoveOnReplace,
} from "@/lib/image-upload";
import { uploadedFilename } from "@/lib/image-upload";
import type { SessionData } from "@/lib/session";
import {
  conflictError,
  forbiddenError,
  notFoundError,
  validationError,
} from "./errors";

/**
 * Shared hostel + room operations (docs/09-build-prompts.md Prompts 2-4).
 * Used by BOTH the admin server actions and the REST API so the two surfaces
 * can never drift. Every mutating function re-checks role + hostel ownership
 * (docs/04-roles-and-scoping.md §7).
 */

/* ------------------------------- reads ---------------------------------- */

export async function listHostels(session: SessionData) {
  // Public (anonymous) and student callers see only approved hostels - exactly
  // what the student landing page renders. Staff see their scoped set.
  const staff = session.role === "ADMIN" || session.role === "MANAGER";
  return db.hostel.findMany({
    where: staff ? hostelScopeWhere(session) : { isApproved: true },
    include: {
      manager: { select: { id: true, name: true } },
      rooms: {
        select: {
          id: true,
          roomNumber: true,
          roomType: true,
          capacity: true,
          pricePerSemester: true,
          status: true,
        },
        orderBy: { roomNumber: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
}

/** Hostel detail with derived per-room availability (never a stored column). */
export async function getHostelById(session: SessionData, id: string) {
  const hostel = await db.hostel.findUnique({
    where: { id },
    include: {
      manager: { select: { id: true, name: true } },
      rooms: {
        include: {
          bookings: { where: { status: "CONFIRMED" }, select: { id: true } },
        },
        orderBy: { roomNumber: "asc" },
      },
    },
  });

  if (!hostel) throw notFoundError("Hostel not found.");
  // Public/student callers may only see published hostels; staff only the
  // hostels in scope (manager: their own; admin: all). Fails closed.
  const staff = session.role === "ADMIN" || session.role === "MANAGER";
  const inScope =
    session.role === "ADMIN" ||
    (session.role === "MANAGER" && session.hostelId === hostel.id);
  if (!staff && !hostel.isApproved) throw notFoundError();
  if (staff && !inScope) throw notFoundError();

  const rooms = hostel.rooms.map((room) => ({
    id: room.id,
    roomNumber: room.roomNumber,
    roomType: room.roomType,
    capacity: room.capacity,
    pricePerSemester: room.pricePerSemester,
    status: room.status,
    description: room.description,
    available: availableBeds(room.capacity, room.bookings.length),
  }));

  return {
    id: hostel.id,
    name: hostel.name,
    type: hostel.type,
    location: hostel.location,
    contactNumber: hostel.contactNumber,
    description: hostel.description,
    facilities: hostel.facilities,
    featuredImage: hostel.featuredImage,
    latitude: hostel.latitude,
    longitude: hostel.longitude,
    isApproved: hostel.isApproved,
    manager: hostel.manager,
    rooms,
  };
}

export async function listRooms(session: SessionData, hostelId: string) {
  // Same visibility rule as getHostelById - resolve the hostel first.
  await getHostelById(session, hostelId);
  return db.room.findMany({
    where: { hostelId },
    include: {
      bookings: { where: { status: "CONFIRMED" }, select: { id: true } },
    },
    orderBy: { roomNumber: "asc" },
  });
}

/* ------------------------------- hostels -------------------------------- */

/**
 * Replace a hostel's featured photo with an uploaded image (manager: own;
 * admin: any). The file is validated, written under public/hostels/ with a
 * server-generated name, the column updated, and any previous uploaded file
 * removed (seed photos are never touched). Same service for the server action
 * and POST /api/hostels/:id/image.
 */
export async function uploadHostelImage(
  session: SessionData,
  hostelId: string,
  file: { type: string | null; size: number; bytes: Uint8Array },
) {
  const extension = imageExtensionFor(file.type);
  if (!extension) {
    throw validationError(
      "Unsupported image type - use JPEG, PNG or WebP.",
    );
  }
  if (!isWithinImageSizeLimit(file.size)) {
    throw validationError("Image must be 10 MB or smaller.");
  }
  if (file.bytes.byteLength === 0) {
    throw validationError("The uploaded file is empty.");
  }

  const hostel = await db.hostel.findUnique({
    where: { id: hostelId },
    select: { id: true, featuredImage: true },
  });
  if (!hostel) throw notFoundError("Hostel not found.");
  if (!canManageHostel(session, hostel.id)) throw forbiddenError();

  const filename = buildImageFilename(hostel.id, extension);
  const uploadsDir = join(process.cwd(), "public", "hostels");
  await writeFile(join(uploadsDir, filename), file.bytes);

  const updated = await db.hostel.update({
    where: { id: hostel.id },
    data: { featuredImage: `/hostels/${filename}` },
    select: { id: true, featuredImage: true },
  });

  // Best-effort cleanup of the image this upload replaces - never the seeds.
  if (shouldRemoveOnReplace(hostel.featuredImage)) {
    const previous = hostel.featuredImage!.split("/").pop()!;
    await unlink(join(uploadsDir, previous)).catch(() => {
      // Removing a stale file must not fail the upload.
    });
  }

  await audit({
    action: "hostel.image_uploaded",
    userId: session.userId!,
    subjectType: "Hostel",
    subjectId: hostel.id,
  });
  return updated;
}

async function writeManagedImage(
  ownerId: string,
  currentPath: string | null,
  file: { type: string | null; size: number; bytes: Uint8Array },
) {
  const extension = imageExtensionFor(file.type);
  if (!extension) {
    throw validationError("Unsupported image type - use JPEG, PNG or WebP.");
  }
  if (!isWithinImageSizeLimit(file.size)) {
    throw validationError("Image must be 10 MB or smaller.");
  }
  if (file.bytes.byteLength === 0) {
    throw validationError("The uploaded file is empty.");
  }
  const filename = buildImageFilename(ownerId, extension);
  const uploadsDir = join(process.cwd(), "public", "hostels");
  await writeFile(join(uploadsDir, filename), file.bytes);
  if (shouldRemoveOnReplace(currentPath)) {
    const previous = currentPath!.split("/").pop()!;
    await unlink(join(uploadsDir, previous)).catch(() => {});
  }
  return `/hostels/${filename}`;
}

/** Replace a room photo (manager: own hostel; admin: any). */
export async function uploadRoomImage(
  session: SessionData,
  roomId: string,
  file: { type: string | null; size: number; bytes: Uint8Array },
) {
  const room = await db.room.findUnique({
    where: { id: roomId },
    select: { id: true, hostelId: true, featuredImage: true },
  });
  if (!room) throw notFoundError("Room not found.");
  if (!canManageHostel(session, room.hostelId)) throw forbiddenError();

  const path = await writeManagedImage(`room-${room.id}`, room.featuredImage, file);
  const updated = await db.room.update({
    where: { id: room.id },
    data: { featuredImage: path },
    select: { id: true, featuredImage: true },
  });
  await audit({
    action: "room.image_uploaded",
    userId: session.userId!,
    subjectType: "Room",
    subjectId: room.id,
  });
  return updated;
}

/** Remove a room photo (manager: own hostel; admin: any). Idempotent. */
export async function removeRoomImage(session: SessionData, roomId: string) {
  const room = await db.room.findUnique({
    where: { id: roomId },
    select: { id: true, hostelId: true, featuredImage: true },
  });
  if (!room) throw notFoundError("Room not found.");
  if (!canManageHostel(session, room.hostelId)) throw forbiddenError();
  if (!room.featuredImage) return room;

  if (shouldRemoveOnReplace(room.featuredImage)) {
    const file = uploadedFilename(room.featuredImage);
    if (file) {
      await unlink(join(process.cwd(), "public", "hostels", file)).catch(() => {});
    }
  }
  const updated = await db.room.update({
    where: { id: room.id },
    data: { featuredImage: null },
    select: { id: true, featuredImage: true },
  });
  await audit({
    action: "room.image_removed",
    userId: session.userId!,
    subjectType: "Room",
    subjectId: room.id,
  });
  return updated;
}

export async function createHostel(session: SessionData, raw: Record<string, unknown>) {
  const parsed = hostelSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  if (isManager(session) && session.hostelId) {
    throw conflictError("You already manage a hostel - only one per manager.");
  }

  const data = parsed.data;
  const facilities = data.facilities.join(", ");

  const created = await db.$transaction(async (tx) => {
    const hostel = await tx.hostel.create({
      data: {
        name: data.name,
        type: data.type,
        location: data.location,
        contactNumber: data.contactNumber || null,
        description: data.description || null,
        facilities: facilities || null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        isApproved: false, // unpublished until an admin approves it
      },
    });
    if (isManager(session)) {
      // A manager creating a hostel becomes its manager (1:1 via User.hostelId).
      await tx.user.update({
        where: { id: session.userId! },
        data: { hostelId: hostel.id },
      });
    }
    return hostel;
  });

  await audit({
    action: "hostel.created",
    userId: session.userId!,
    subjectType: "Hostel",
    subjectId: created.id,
  });
  return created;
}

export async function updateHostel(
  session: SessionData,
  hostelId: string,
  raw: Record<string, unknown>,
) {
  const hostel = await db.hostel.findUnique({ where: { id: hostelId } });
  if (!hostel) throw notFoundError("Hostel not found.");
  if (!canManageHostel(session, hostel.id)) throw forbiddenError();

  // PATCH semantics: absent fields keep their current value, so a client can
  // send only the fields it changes. Present-but-blank fields clear (the
  // schema normalizes "" and null to null). Facilities round-trip through the
  // comma-joined storage format. The UI form always sends every field, which
  // makes the merge a no-op for it.
  const merged = {
    name: raw.name ?? hostel.name,
    type: raw.type ?? hostel.type,
    location: raw.location ?? hostel.location,
    contactNumber: "contactNumber" in raw ? raw.contactNumber : hostel.contactNumber,
    description: "description" in raw ? raw.description : hostel.description,
    facilities:
      raw.facilities ??
      (hostel.facilities ?? "")
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean) ??
      [],
    latitude: "latitude" in raw ? raw.latitude : hostel.latitude,
    longitude: "longitude" in raw ? raw.longitude : hostel.longitude,
  };
  const parsed = hostelSchema.safeParse(merged);
  if (!parsed.success) {
    throw validationError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const data = parsed.data;
  const updated = await db.hostel.update({
    where: { id: hostel.id },
    data: {
      name: data.name,
      type: data.type,
      location: data.location,
      contactNumber: data.contactNumber || null,
      description: data.description || null,
      facilities: data.facilities.join(", ") || null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
    },
  });

  await audit({
    action: "hostel.updated",
    userId: session.userId!,
    subjectType: "Hostel",
    subjectId: hostel.id,
  });
  return updated;
}

/**
 * Remove a hostel's photo (manager: own; admin: any). The featuredImage
 * column is cleared; the file itself is deleted only when it was an upload
 * (seed photos are kept on disk and just unlinked from the record).
 */
export async function removeHostelImage(session: SessionData, hostelId: string) {
  const hostel = await db.hostel.findUnique({
    where: { id: hostelId },
    select: { id: true, featuredImage: true },
  });
  if (!hostel) throw notFoundError("Hostel not found.");
  if (!canManageHostel(session, hostel.id)) throw forbiddenError();
  if (!hostel.featuredImage) return hostel; // nothing to remove - idempotent

  if (shouldRemoveOnReplace(hostel.featuredImage)) {
    const file = uploadedFilename(hostel.featuredImage);
    if (file) {
      await unlink(join(process.cwd(), "public", "hostels", file)).catch(() => {
        // Removing a stale file must not fail the operation.
      });
    }
  }

  const updated = await db.hostel.update({
    where: { id: hostel.id },
    data: { featuredImage: null },
    select: { id: true, featuredImage: true },
  });

  await audit({
    action: "hostel.image_removed",
    userId: session.userId!,
    subjectType: "Hostel",
    subjectId: hostel.id,
  });
  return updated;
}

/**
 * Set who manages a hostel (admin only - caller guards). Atomically demotes
 * the previous manager (hostelId null, role back to STUDENT), clears any
 * hostel the chosen user already managed, then assigns them. Assigning
 * "null" simply clears the manager. One manager per hostel, always.
 */
export async function setHostelManager(
  session: SessionData,
  hostelId: string,
  userId: string | null,
) {
  const hostel = await db.hostel.findUnique({
    where: { id: hostelId },
    include: { manager: { select: { id: true } } },
  });
  if (!hostel) throw notFoundError("Hostel not found.");

  let target: { id: string; role: string } | null = null;
  if (userId) {
    target = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!target) throw notFoundError("User not found.");
    if (target.role === "ADMIN") {
      throw conflictError("An administrator cannot be scoped to a single hostel.");
    }
  }

  await db.$transaction(async (tx) => {
    // Demote the current manager (if any) back to student.
    if (hostel.manager) {
      await tx.user.update({
        where: { id: hostel.manager.id },
        data: { hostelId: null, role: "STUDENT" },
      });
    }
    if (target) {
      // If the chosen user managed another hostel, free that link first.
      await tx.user.updateMany({
        where: { id: target.id, hostelId: { not: null } },
        data: { hostelId: null },
      });
      await tx.user.update({
        where: { id: target.id },
        data: { hostelId, role: "MANAGER" },
      });
    }
    await tx.activityLog.create({
      data: {
        action: userId ? "hostel.manager_set" : "hostel.manager_cleared",
        userId: session.userId!,
        subjectType: "Hostel",
        subjectId: hostel.id,
      },
    });
  });

  return db.hostel.findUnique({
    where: { id: hostelId },
    include: { manager: { select: { id: true, name: true } } },
  });
}

/** Delete a hostel. Administrators only; blocked while any room has bookings. */
export async function deleteHostel(session: SessionData, hostelId: string) {
  const hostel = await db.hostel.findUnique({
    where: { id: hostelId },
    include: {
      rooms: { select: { _count: { select: { bookings: true } } } },
    },
  });
  if (!hostel) throw notFoundError("Hostel not found.");

  const booked = hostel.rooms.some((room) => room._count.bookings > 0);
  if (booked) {
    throw conflictError(
      "This hostel has bookings and cannot be deleted. Close its rooms instead.",
    );
  }

  await db.$transaction(async (tx) => {
    // Rooms cascade (schema onDelete: Cascade); clear the manager link first.
    await tx.user.updateMany({
      where: { hostelId },
      data: { hostelId: null },
    });
    await tx.hostel.delete({ where: { id: hostelId } });
    await tx.activityLog.create({
      data: {
        action: "hostel.deleted",
        userId: session.userId!,
        subjectType: "Hostel",
        subjectId: hostelId,
      },
    });
  });
}

/** Publish / unpublish a hostel. Administrators only (capability matrix). */
export async function toggleHostelApproval(session: SessionData, hostelId: string) {
  const hostel = await db.hostel.findUnique({
    where: { id: hostelId },
    select: { id: true, isApproved: true },
  });
  if (!hostel) throw notFoundError("Hostel not found.");

  await db.$transaction(async (tx) => {
    await tx.hostel.update({
      where: { id: hostelId },
      data: { isApproved: !hostel.isApproved },
    });
    await tx.activityLog.create({
      data: {
        action: hostel.isApproved ? "hostel.unpublished" : "hostel.published",
        userId: session.userId!,
        subjectType: "Hostel",
        subjectId: hostelId,
      },
    });
  });
  return { isApproved: !hostel.isApproved };
}

/* -------------------------------- rooms --------------------------------- */

export async function createRoom(
  session: SessionData,
  hostelId: string,
  raw: Record<string, unknown>,
) {
  const parsed = roomSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const hostel = await db.hostel.findUnique({ where: { id: hostelId } });
  if (!hostel) throw notFoundError("Hostel not found.");
  if (!canManageHostel(session, hostel.id)) throw forbiddenError();

  const data = parsed.data;
  await db.$transaction(async (tx) => {
    const exists = await tx.room.findUnique({
      where: { hostelId_roomNumber: { hostelId, roomNumber: data.roomNumber } },
    });
    if (exists) throw conflictError(`Room ${data.roomNumber} already exists in this hostel.`);

    await tx.room.create({
      data: {
        hostelId,
        roomNumber: data.roomNumber,
        roomType: data.roomType,
        capacity: data.capacity,
        pricePerSemester: data.pricePerSemester,
        status: data.status,
        description: data.description || null,
      },
    });
    await tx.activityLog.create({
      data: {
        action: "room.created",
        userId: session.userId!,
        subjectType: "Hostel",
        subjectId: hostelId,
      },
    });
  });
  return db.room.findUnique({ where: { hostelId_roomNumber: { hostelId, roomNumber: data.roomNumber } } });
}

export async function updateRoom(
  session: SessionData,
  roomId: string,
  raw: Record<string, unknown>,
) {
  const parsed = roomSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const room = await db.room.findUnique({ where: { id: roomId } });
  if (!room) throw notFoundError("Room not found.");
  if (!canManageHostel(session, room.hostelId)) throw forbiddenError();

  const data = parsed.data;
  await db.$transaction(async (tx) => {
    const exists = await tx.room.findUnique({
      where: { hostelId_roomNumber: { hostelId: room.hostelId, roomNumber: data.roomNumber } },
    });
    if (exists && exists.id !== roomId) {
      throw conflictError(`Room ${data.roomNumber} already exists in this hostel.`);
    }

    await tx.room.update({
      where: { id: roomId },
      data: {
        roomNumber: data.roomNumber,
        roomType: data.roomType,
        capacity: data.capacity,
        pricePerSemester: data.pricePerSemester,
        status: data.status,
        description: data.description || null,
      },
    });
    await tx.activityLog.create({
      data: {
        action: "room.updated",
        userId: session.userId!,
        subjectType: "Room",
        subjectId: roomId,
      },
    });
  });
  return db.room.findUnique({ where: { id: roomId } });
}

export async function deleteRoom(session: SessionData, roomId: string) {
  const room = await db.room.findUnique({
    where: { id: roomId },
    include: { _count: { select: { bookings: true } } },
  });
  if (!room) throw notFoundError("Room not found.");
  if (!canManageHostel(session, room.hostelId)) throw forbiddenError();
  if (room._count.bookings > 0) {
    throw conflictError(
      "This room has bookings and cannot be deleted - mark it CLOSED instead.",
    );
  }

  if (shouldRemoveOnReplace(room.featuredImage)) {
    const file = uploadedFilename(room.featuredImage);
    if (file) {
      await unlink(join(process.cwd(), "public", "hostels", file)).catch(() => {});
    }
  }

  await db.$transaction(async (tx) => {
    await tx.room.delete({ where: { id: room.id } });
    await tx.activityLog.create({
      data: {
        action: "room.deleted",
        userId: session.userId!,
        subjectType: "Room",
        subjectId: room.id,
      },
    });
  });
}

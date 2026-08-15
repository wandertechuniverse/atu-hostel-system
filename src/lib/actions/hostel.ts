"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { revalidateStaff } from "@/lib/revalidate-staff";
import { requireCsrf } from "@/lib/csrf";
import { errorMessage } from "@/lib/services/errors";
import {
  createHostel,
  createRoom,
  deleteHostel,
  deleteRoom,
  removeHostelImage,
  removeRoomImage,
  setHostelManager,
  updateHostel,
  updateRoom,
  uploadHostelImage,
  uploadRoomImage,
} from "@/lib/services/hostels";

export type HostelFormState = { ok?: boolean; error?: string };

export type UploadImageState = { ok?: boolean; error?: string; path?: string };

async function guardCsrf(formData: FormData): Promise<HostelFormState | null> {
  try {
    await requireCsrf(formData);
    return null;
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

/** Create or update a hostel (docs/09-build-prompts.md Prompt 3). */
export async function hostelFormAction(
  _prev: HostelFormState,
  formData: FormData,
): Promise<HostelFormState> {
  const csrf = await guardCsrf(formData);
  if (csrf) return csrf;
  const session = await requireRole("MANAGER", "ADMIN");
  const hostelId = String(formData.get("hostelId") ?? "").trim();
  const raw = {
    name: formData.get("name"),
    type: formData.get("type"),
    location: formData.get("location"),
    contactNumber: formData.get("contactNumber"),
    description: formData.get("description"),
    facilities: formData.getAll("facilities"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
  };

  try {
    if (hostelId) await updateHostel(session, hostelId, raw);
    else await createHostel(session, raw);
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidateStaff("/hostels");
  revalidateStaff();
  return { ok: true };
}

/**
 * Set who manages a hostel (admin only). Atomically demotes the previous
 * manager and promotes the chosen user; empty userId clears the manager.
 */
export async function setHostelManagerAction(
  _prev: HostelFormState,
  formData: FormData,
): Promise<HostelFormState> {
  const csrf = await guardCsrf(formData);
  if (csrf) return csrf;
  const session = await requireRole("ADMIN");
  const userId = String(formData.get("userId") ?? "").trim();
  try {
    await setHostelManager(
      session,
      String(formData.get("hostelId") ?? ""),
      userId || null,
    );
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidateStaff("/hostels");
  revalidatePath("/admin/users");
  revalidateStaff();
  return { ok: true };
}

/** Replace a hostel's photo with an uploaded image (manager: own; admin: any). */
export async function uploadHostelImageAction(
  _prev: UploadImageState,
  formData: FormData,
): Promise<UploadImageState> {
  try {
    await requireCsrf(formData);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  const session = await requireRole("MANAGER", "ADMIN");
  const hostelId = String(formData.get("hostelId") ?? "").trim();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Choose an image to upload." };
  }

  let updated: { featuredImage: string | null };
  try {
    updated = await uploadHostelImage(session, hostelId, {
      type: file.type,
      size: file.size,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidateStaff("/hostels");
  revalidateStaff();
  revalidatePath("/");
  return { ok: true, path: updated.featuredImage ?? undefined };
}

/** Remove a hostel's photo (manager: own; admin: any). Idempotent. */
export async function removeHostelImageAction(
  _prev: HostelFormState,
  formData: FormData,
): Promise<HostelFormState> {
  const csrf = await guardCsrf(formData);
  if (csrf) return csrf;
  const session = await requireRole("MANAGER", "ADMIN");
  try {
    await removeHostelImage(session, String(formData.get("hostelId") ?? ""));
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidateStaff("/hostels");
  revalidateStaff();
  revalidatePath("/");
  return { ok: true };
}

/** Replace a room photo (manager: own hostel; admin: any). */
export async function uploadRoomImageAction(
  _prev: UploadImageState,
  formData: FormData,
): Promise<UploadImageState> {
  try {
    await requireCsrf(formData);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  const session = await requireRole("MANAGER", "ADMIN");
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Choose an image to upload." };
  }
  let updated: { featuredImage: string | null };
  try {
    updated = await uploadRoomImage(session, String(formData.get("roomId") ?? ""), {
      type: file.type,
      size: file.size,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidateStaff("/hostels");
  revalidateStaff();
  revalidatePath("/");
  return { ok: true, path: updated.featuredImage ?? undefined };
}

/** Remove a room photo (manager: own hostel; admin: any). */
export async function removeRoomImageAction(
  _prev: HostelFormState,
  formData: FormData,
): Promise<HostelFormState> {
  const csrf = await guardCsrf(formData);
  if (csrf) return csrf;
  const session = await requireRole("MANAGER", "ADMIN");
  try {
    await removeRoomImage(session, String(formData.get("roomId") ?? ""));
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidateStaff("/hostels");
  revalidateStaff();
  revalidatePath("/");
  return { ok: true };
}

/** Create or update a room on a hostel (M2 CRUD). */
export async function roomFormAction(
  _prev: HostelFormState,
  formData: FormData,
): Promise<HostelFormState> {
  const csrf = await guardCsrf(formData);
  if (csrf) return csrf;
  const session = await requireRole("MANAGER", "ADMIN");
  const hostelId = String(formData.get("hostelId") ?? "").trim();
  const roomId = String(formData.get("roomId") ?? "").trim();
  const raw = {
    roomNumber: formData.get("roomNumber"),
    roomType: formData.get("roomType"),
    capacity: formData.get("capacity"),
    pricePerSemester: formData.get("pricePerSemester"),
    status: formData.get("status"),
    description: formData.get("description"),
  };

  try {
    if (roomId) await updateRoom(session, roomId, raw);
    else await createRoom(session, hostelId, raw);
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidateStaff("/hostels");
  revalidateStaff();
  return { ok: true };
}

export async function deleteRoomAction(
  _prev: HostelFormState,
  formData: FormData,
): Promise<HostelFormState> {
  const csrf = await guardCsrf(formData);
  if (csrf) return csrf;
  const session = await requireRole("MANAGER", "ADMIN");
  try {
    await deleteRoom(session, String(formData.get("roomId") ?? ""));
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidateStaff("/hostels");
  revalidateStaff();
  return { ok: true };
}

/** Delete a hostel. Administrators only; blocked while any of its rooms have bookings. */
export async function deleteHostelAction(
  _prev: HostelFormState,
  formData: FormData,
): Promise<HostelFormState> {
  const csrf = await guardCsrf(formData);
  if (csrf) return csrf;
  const session = await requireRole("ADMIN");
  try {
    await deleteHostel(session, String(formData.get("hostelId") ?? ""));
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidateStaff("/hostels");
  revalidateStaff();
  revalidatePath("/");
  return { ok: true };
}

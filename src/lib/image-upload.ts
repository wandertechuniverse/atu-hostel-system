/**
 * Hostel photo upload rules (pure module - no fs, no db, unit-testable).
 *
 * The admin can replace a hostel's featured image with their own photo. The
 * file is validated here (type + size whitelist), stored under public/hostels/
 * with a server-generated name, and the Hostel.featuredImage column points at
 * it. The filename is NEVER taken from the client (docs/02-architecture.md §6).
 */

/** Accepted MIME types -> file extensions. Everything else is rejected. */
export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Max upload size: 5 MB (generous for phone photos, small for the demo). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** The four canonical seed photos - never deleted by an upload's cleanup pass. */
export const SEED_IMAGE_FILES = new Set([
  "campus.jpg",
  "alhassan.jpg",
  "tf-lodge.jpg",
  "bubuashie.jpg",
]);

export function imageExtensionFor(mimeType: string | undefined | null): string | null {
  if (!mimeType) return null;
  return IMAGE_TYPES[mimeType.toLowerCase()] ?? null;
}

export function isAllowedImageType(mimeType: string | undefined | null): boolean {
  return imageExtensionFor(mimeType) !== null;
}

export function isWithinImageSizeLimit(bytes: number | undefined | null): boolean {
  return typeof bytes === "number" && bytes > 0 && bytes <= MAX_IMAGE_BYTES;
}

/** Server-generated filename: never trust anything from the client. */
export function buildImageFilename(hostelId: string, extension: string): string {
  const safeId = hostelId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 36) || "hostel";
  // Timestamp + random suffix so two uploads in the same millisecond cannot
  // collide and overwrite each other.
  const stamp = Date.now().toString(36);
  const nonce = Math.random().toString(36).slice(2, 8);
  return `${safeId}-${stamp}-${nonce}.${extension}`;
}

/** True when the path points into our managed uploads directory. */
export function isManagedUploadPath(path: string | null | undefined): boolean {
  return typeof path === "string" && path.startsWith("/hostels/");
}

/** Only delete files we uploaded ourselves - never the seed photos. */
export function shouldRemoveOnReplace(path: string | null | undefined): boolean {
  if (typeof path !== "string" || !path.startsWith("/hostels/")) return false;
  const file = path.split("/").pop();
  return !!file && !SEED_IMAGE_FILES.has(file);
}

/**
 * Extract the on-disk filename of an uploaded photo from its /hostels/ path.
 * Returns null for seed photos (never deleted from disk - removing them only
 * unlinks the record) and for anything outside the managed uploads dir.
 */
export function uploadedFilename(path: string | null | undefined): string | null {
  if (typeof path !== "string" || !path.startsWith("/hostels/")) return null;
  const file = path.split("/").pop();
  return file && !SEED_IMAGE_FILES.has(file) ? file : null;
}

import { describe, expect, it } from "vitest";
import {
  buildImageFilename,
  imageExtensionFor,
  isAllowedImageType,
  isWithinImageSizeLimit,
  MAX_IMAGE_BYTES,
  shouldRemoveOnReplace,
} from "@/lib/image-upload";

describe("imageExtensionFor", () => {
  it("maps the three allowed MIME types to extensions", () => {
    expect(imageExtensionFor("image/jpeg")).toBe("jpg");
    expect(imageExtensionFor("image/png")).toBe("png");
    expect(imageExtensionFor("image/webp")).toBe("webp");
    expect(imageExtensionFor("IMAGE/PNG")).toBe("png");
  });

  it("rejects anything else, including SVG (scriptable) and missing types", () => {
    expect(imageExtensionFor("image/svg+xml")).toBeNull();
    expect(imageExtensionFor("image/gif")).toBeNull();
    expect(imageExtensionFor("text/html")).toBeNull();
    expect(imageExtensionFor("application/pdf")).toBeNull();
    expect(imageExtensionFor(null)).toBeNull();
    expect(imageExtensionFor(undefined)).toBeNull();
    expect(isAllowedImageType("image/gif")).toBe(false);
    expect(isAllowedImageType("image/jpeg")).toBe(true);
  });
});

describe("isWithinImageSizeLimit", () => {
  it("accepts files up to the 10 MB cap", () => {
    expect(isWithinImageSizeLimit(1)).toBe(true);
    expect(isWithinImageSizeLimit(MAX_IMAGE_BYTES)).toBe(true);
  });

  it("rejects empty, negative and oversized files", () => {
    expect(isWithinImageSizeLimit(0)).toBe(false);
    expect(isWithinImageSizeLimit(-5)).toBe(false);
    expect(isWithinImageSizeLimit(MAX_IMAGE_BYTES + 1)).toBe(false);
    expect(isWithinImageSizeLimit(null)).toBe(false);
    expect(isWithinImageSizeLimit(undefined)).toBe(false);
  });
});

describe("buildImageFilename", () => {
  it("never trusts the client id and always uses the whitelisted extension", () => {
    const name = buildImageFilename("hostel-id-123", "jpg");
    expect(name).toMatch(/^hostel-id-123-[a-z0-9-]+\.jpg$/);
    // Path-traversal characters are stripped, so the result can never escape
    // the uploads directory.
    const hostile = buildImageFilename("../../etc/passwd", "png");
    expect(hostile).toMatch(/^etcpasswd-[a-z0-9-]+\.png$/);
    expect(hostile).not.toContain("/");
  });

  it("produces distinct names across calls (no overwrite collisions)", () => {
    const a = buildImageFilename("h1", "png");
    const b = buildImageFilename("h1", "png");
    expect(a).not.toBe(b);
  });
});

describe("shouldRemoveOnReplace", () => {
  it("never deletes seed photos or paths outside the uploads directory", () => {
    expect(shouldRemoveOnReplace("/hostels/campus.jpg")).toBe(false);
    expect(shouldRemoveOnReplace("/hostels/alhassan.jpg")).toBe(false);
    expect(shouldRemoveOnReplace(null)).toBe(false);
    expect(shouldRemoveOnReplace(undefined)).toBe(false);
    expect(shouldRemoveOnReplace("/assets/logo.png")).toBe(false);
  });

  it("cleans up files the app itself uploaded", () => {
    expect(shouldRemoveOnReplace("/hostels/hostel-1-1700000000000.jpg")).toBe(true);
  });
});

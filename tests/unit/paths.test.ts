import { describe, expect, it } from "vitest";
import {
  homeForRole,
  isSharedStaffSection,
  staffPath,
  swapStaffPrefix,
} from "@/lib/paths";

describe("homeForRole", () => {
  it("sends each role to its own prefix", () => {
    expect(homeForRole("STUDENT")).toBe("/");
    expect(homeForRole("MANAGER")).toBe("/manager");
    expect(homeForRole("ADMIN")).toBe("/admin");
  });
});

describe("staffPath", () => {
  it("prefixes manager and admin screens", () => {
    expect(staffPath("MANAGER", "/bookings")).toBe("/manager/bookings");
    expect(staffPath("ADMIN", "/bookings")).toBe("/admin/bookings");
    expect(staffPath("MANAGER")).toBe("/manager");
  });
});

describe("swapStaffPrefix", () => {
  it("rewrites /admin <-> /manager including nested paths", () => {
    expect(swapStaffPrefix("/admin/bookings", "/manager")).toBe(
      "/manager/bookings",
    );
    expect(swapStaffPrefix("/manager/payments", "/admin")).toBe(
      "/admin/payments",
    );
  });
});

describe("isSharedStaffSection", () => {
  it("treats bookings as shared and users as admin-only", () => {
    expect(isSharedStaffSection("bookings")).toBe(true);
    expect(isSharedStaffSection("users")).toBe(false);
  });
});

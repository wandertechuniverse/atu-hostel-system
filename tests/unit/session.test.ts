import { describe, expect, it } from "vitest";
import { isStaffRole, SESSION_COOKIE } from "@/lib/session";

describe("isStaffRole", () => {
  it("admins and managers are staff", () => {
    expect(isStaffRole("ADMIN")).toBe(true);
    expect(isStaffRole("MANAGER")).toBe(true);
  });

  it("students and missing roles are not staff", () => {
    expect(isStaffRole("STUDENT")).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
  });
});

describe("session cookie", () => {
  it("uses a stable, documented cookie name", () => {
    expect(SESSION_COOKIE).toBe("hbms_session");
  });
});

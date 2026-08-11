import { describe, expect, it } from "vitest";
import {
  canManageHostel,
  ForbiddenError,
  isManager,
  isStaff,
  hostelScopeWhere,
  bookingScopeWhere,
  paymentScopeWhere,
} from "@/lib/scoping";

const admin = {
  userId: "u-admin",
  role: "ADMIN",
  hostelId: null,
  isLoggedIn: true,
} as const;
const manager = {
  userId: "u-manager",
  role: "MANAGER",
  hostelId: "hostel-a",
  isLoggedIn: true,
} as const;
// Fails-closed fixture: a manager whose hostelId is null (data error, docs/04 §3).
const orphan = {
  userId: "u-orphan",
  role: "MANAGER",
  hostelId: null,
  isLoggedIn: true,
} as const;
const student = {
  userId: "u-student",
  role: "STUDENT",
  hostelId: null,
  isLoggedIn: true,
} as const;

describe("role helpers", () => {
  it("isStaff is true for admin and manager, false for student", () => {
    expect(isStaff(admin)).toBe(true);
    expect(isStaff(manager)).toBe(true);
    expect(isStaff(student)).toBe(false);
  });

  it("isManager is true only for managers", () => {
    expect(isManager(manager)).toBe(true);
    expect(isManager(admin)).toBe(false);
    expect(isManager(student)).toBe(false);
  });
});

describe("hostelScopeWhere", () => {
  it("admins see every hostel", () => {
    expect(hostelScopeWhere(admin)).toEqual({});
  });

  it("managers are scoped to their own hostel id", () => {
    expect(hostelScopeWhere(manager)).toEqual({ id: "hostel-a" });
  });

  it("a manager with null hostelId fails closed to an impossible id", () => {
    expect(hostelScopeWhere(orphan)).toEqual({ id: "__none__" });
  });
});

describe("bookingScopeWhere", () => {
  it("admins see every booking", () => {
    expect(bookingScopeWhere(admin)).toEqual({});
  });

  it("managers only see bookings in their hostel", () => {
    expect(bookingScopeWhere(manager)).toEqual({
      room: { hostelId: "hostel-a" },
    });
  });

  it("a manager with null hostelId matches nothing", () => {
    expect(bookingScopeWhere(orphan)).toEqual({
      room: { hostelId: "__none__" },
    });
  });
});

describe("paymentScopeWhere", () => {
  it("admins see every payment", () => {
    expect(paymentScopeWhere(admin)).toEqual({});
  });

  it("managers only see payments for their hostel", () => {
    expect(paymentScopeWhere(manager)).toEqual({
      booking: { room: { hostelId: "hostel-a" } },
    });
  });

  it("a manager with null hostelId matches nothing", () => {
    expect(paymentScopeWhere(orphan)).toEqual({
      booking: { room: { hostelId: "__none__" } },
    });
  });
});

describe("canManageHostel (per-record authorization, docs/04 §5)", () => {
  it("admins can manage any hostel", () => {
    expect(canManageHostel(admin, "hostel-a")).toBe(true);
    expect(canManageHostel(admin, "hostel-b")).toBe(true);
  });

  it("managers can manage only their own hostel", () => {
    expect(canManageHostel(manager, "hostel-a")).toBe(true);
    expect(canManageHostel(manager, "hostel-b")).toBe(false);
  });

  it("a manager with null hostelId is denied everything (fails closed)", () => {
    expect(canManageHostel(orphan, "hostel-a")).toBe(false);
    expect(canManageHostel(orphan, "hostel-b")).toBe(false);
  });

  it("students can never manage a hostel", () => {
    expect(canManageHostel(student, "hostel-a")).toBe(false);
  });
});

describe("ForbiddenError", () => {
  it("carries a safe, non-leaky message", () => {
    const error = new ForbiddenError();
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ForbiddenError");
    expect(error.message).toBe("You do not have permission to perform this action.");
  });
});

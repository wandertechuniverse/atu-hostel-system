import { describe, expect, it } from "vitest";
import {
  adminUpdateUserSchema,
  changePasswordSchema,
  hostelSchema,
  roomSchema,
  loginSchema,
  registerSchema,
} from "@/lib/validation";

describe("hostelSchema (Prompt 3 form)", () => {
  const valid = {
    name: "Al-Hassan Hostel",
    type: "PRIVATE",
    location: "Bubuashie, near ATU",
    contactNumber: "020 000 0000",
    description: "24-hour security",
    facilities: ["Wi-Fi", "Water"],
  };

  it("accepts a valid hostel", () => {
    expect(hostelSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a too-short name and empty location", () => {
    expect(hostelSchema.safeParse({ ...valid, name: "AB" }).success).toBe(false);
    expect(hostelSchema.safeParse({ ...valid, location: "" }).success).toBe(false);
  });

  it("rejects an unknown category (role-style values are never accepted)", () => {
    expect(hostelSchema.safeParse({ ...valid, type: "ADMIN" }).success).toBe(false);
  });

  it("accepts missing optional contact and description", () => {
    const { contactNumber, description, ...rest } = valid;
    expect(hostelSchema.safeParse(rest).success).toBe(true);
  });

  it("keeps facilities as a bounded array", () => {
    const many = { ...valid, facilities: Array.from({ length: 20 }, (_, i) => `F${i}`) };
    expect(hostelSchema.safeParse(many).success).toBe(false);
  });

  it("accepts optional map coordinates (numbers or coerceable strings)", () => {
    const withCoords = {
      ...valid,
      latitude: "5.5629",
      longitude: "-0.2219",
    };
    const parsed = hostelSchema.safeParse(withCoords);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.latitude).toBe(5.5629);
      expect(parsed.data.longitude).toBe(-0.2219);
    }
  });

  it("normalizes a blank coordinate field to null (empty form input)", () => {
    const parsed = hostelSchema.safeParse({ ...valid, latitude: "", longitude: "" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.latitude).toBeNull();
      expect(parsed.data.longitude).toBeNull();
    }
  });

  it("rejects out-of-range coordinates", () => {
    expect(
      hostelSchema.safeParse({ ...valid, latitude: 91 }).success,
    ).toBe(false);
    expect(
      hostelSchema.safeParse({ ...valid, longitude: -181 }).success,
    ).toBe(false);
  });
});

describe("roomSchema", () => {
  it("coerces numeric strings and clamps capacity and price", () => {
    const result = roomSchema.safeParse({
      roomNumber: "105",
      roomType: "2-in-1",
      capacity: "2",
      pricePerSemester: "1200",
      status: "AVAILABLE",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.capacity).toBe(2);
      expect(result.data.pricePerSemester).toBe(1200);
    }
  });

  it("rejects a negative price and an empty room number", () => {
    expect(
      roomSchema.safeParse({
        roomNumber: "",
        roomType: "2-in-1",
        capacity: 2,
        pricePerSemester: 1200,
        status: "AVAILABLE",
      }).success,
    ).toBe(false);
    expect(
      roomSchema.safeParse({
        roomNumber: "105",
        roomType: "2-in-1",
        capacity: 2,
        pricePerSemester: -5,
        status: "AVAILABLE",
      }).success,
    ).toBe(false);
  });
});

describe("loginSchema / registerSchema", () => {
  it("login requires an email and a password", () => {
    expect(loginSchema.safeParse({ email: "student@atu.edu.gh", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "student@atu.edu.gh", password: "" }).success).toBe(false);
  });

  it("registration enforces the 8-character password policy (SECURITY.md §3)", () => {
    const base = {
      name: "Ama Serwaa",
      email: "ama@atu.edu.gh",
      phone: "024 000 0000",
    };
    expect(
      registerSchema.safeParse({ ...base, password: "1234567" }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({ ...base, password: "12345678" }).success,
    ).toBe(true);
  });
});

describe("changePasswordSchema (FR-9 self-service)", () => {
  it("accepts a correct current + matching 8-char new password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old-password",
      newPassword: "brand-new-pass",
      confirmPassword: "brand-new-pass",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a mismatched confirm password (server-side check, not just client)", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old-password",
      newPassword: "brand-new-pass",
      confirmPassword: "different-pass",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain("confirmPassword");
  });

  it("rejects a too-short new password and an empty current password", () => {
    const short = changePasswordSchema.safeParse({
      currentPassword: "old",
      newPassword: "short",
      confirmPassword: "short",
    });
    expect(short.success).toBe(false);

    const emptyCurrent = changePasswordSchema.safeParse({
      currentPassword: "",
      newPassword: "brand-new-pass",
      confirmPassword: "brand-new-pass",
    });
    expect(emptyCurrent.success).toBe(false);
  });
});

describe("adminUpdateUserSchema", () => {
  const base = {
    name: "Kwame Mensah",
    email: "kwame@atu.edu.gh",
    phone: "020 000 0000",
  };

  it("accepts a valid profile with no password (keeps the current hash)", () => {
    expect(adminUpdateUserSchema.safeParse(base).success).toBe(true);
  });

  it("accepts a password reset with empty optional fields", () => {
    expect(
      adminUpdateUserSchema.safeParse({
        ...base,
        password: "newsecret1",
        studentIdNumber: "",
        department: "",
      }).success,
    ).toBe(true);
  });

  it("rejects a short reset password and a malformed email", () => {
    expect(
      adminUpdateUserSchema.safeParse({ ...base, password: "1234567" }).success,
    ).toBe(false);
    expect(
      adminUpdateUserSchema.safeParse({ ...base, email: "not-an-email" }).success,
    ).toBe(false);
  });
});

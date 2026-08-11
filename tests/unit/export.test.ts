import { describe, expect, it } from "vitest";
import {
  EXPORT_FORMAT,
  EXPORT_VERSION,
  redactUser,
} from "@/lib/export-format";

describe("redactUser", () => {
  it("drops the password hash but keeps every other field", () => {
    const user = {
      id: "u1",
      name: "Ama",
      email: "ama@atu.edu.gh",
      password: "$2a$10$abcdefghijklmnopqrstuv",
      role: "STUDENT",
      isActive: true,
    };
    const redacted = redactUser(user);
    expect(redacted).not.toHaveProperty("password");
    expect(redacted).toEqual({
      id: "u1",
      name: "Ama",
      email: "ama@atu.edu.gh",
      role: "STUDENT",
      isActive: true,
    });
  });

  it("is a pure copy - the source object is untouched", () => {
    const user = { id: "u2", password: "hash" };
    redactUser(user);
    expect(user).toHaveProperty("password");
  });
});

describe("export metadata", () => {
  it("is a versioned, identifiable snapshot format", () => {
    expect(EXPORT_FORMAT).toBe("hbms-backup");
    expect(EXPORT_VERSION).toBe(1);
  });
});

import { describe, expect, it } from "vitest";
import { bookingRequestSchema, updateProfileSchema } from "@/lib/validation";
import { parseActivityQuery } from "@/lib/services/activity";

describe("updateProfileSchema (FR-9)", () => {
  it("accepts a valid student profile", () => {
    const parsed = updateProfileSchema.safeParse({
      name: "Ama Mensah",
      phone: "0244123456",
      department: "IT",
      studentIdNumber: "01240233C",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a short name", () => {
    const parsed = updateProfileSchema.safeParse({
      name: "A",
      phone: "0244123456",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("bookingRequestSchema", () => {
  it("requires rules acceptance and a session", () => {
    const ok = bookingRequestSchema.safeParse({
      roomId: "room-1",
      academicSession: "2026/2027",
      notes: "",
      acceptRules: "on",
    });
    expect(ok.success).toBe(true);

    const denied = bookingRequestSchema.safeParse({
      roomId: "room-1",
      academicSession: "2026/2027",
      acceptRules: false,
    });
    expect(denied.success).toBe(false);
  });
});

describe("parseActivityQuery", () => {
  it("parses filters and page size", () => {
    const q = parseActivityQuery(
      new URLSearchParams(
        "action=auth.login&page=2&pageSize=50&subjectType=User&q=ama&from=2026-01-01&to=2026-08-01",
      ),
    );
    expect(q).toEqual({
      action: "auth.login",
      subjectType: "User",
      q: "ama",
      from: "2026-01-01",
      to: "2026-08-01",
      page: 2,
      pageSize: 50,
    });
  });

  it("rejects invalid action filters", () => {
    expect(() =>
      parseActivityQuery(new URLSearchParams("action=drop table")),
    ).toThrow(/Invalid action/i);
  });
});

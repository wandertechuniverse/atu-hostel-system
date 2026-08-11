import { describe, expect, it } from "vitest";
import { updateProfileSchema } from "@/lib/validation";
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

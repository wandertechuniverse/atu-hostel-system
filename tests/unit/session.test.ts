import { describe, expect, it } from "vitest";
import {
  DEV_SESSION_SECRET,
  isStaffRole,
  resolveSessionSecret,
  SESSION_COOKIE,
} from "@/lib/session";

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

describe("resolveSessionSecret", () => {
  it("allows the fallback outside production", () => {
    expect(resolveSessionSecret({})).toBe(DEV_SESSION_SECRET);
    expect(resolveSessionSecret({ SESSION_SECRET: " local-secret " })).toBe(
      "local-secret",
    );
  });

  it("rejects a missing or fallback secret in production", () => {
    expect(() => resolveSessionSecret({ NODE_ENV: "production" })).toThrow(
      /SESSION_SECRET/,
    );
    expect(() =>
      resolveSessionSecret({
        NODE_ENV: "production",
        SESSION_SECRET: DEV_SESSION_SECRET,
      }),
    ).toThrow(/SESSION_SECRET/);
  });

  it("accepts a real secret in production", () => {
    expect(
      resolveSessionSecret({
        NODE_ENV: "production",
        SESSION_SECRET: "a-long-random-secret",
      }),
    ).toBe("a-long-random-secret");
  });
});

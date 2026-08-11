import { afterEach, describe, expect, it } from "vitest";
import {
  basicAuthEnabled,
  verifyBasicAuthHeader,
} from "@/lib/basic-auth";

const ORIGINAL_USER = process.env.ADMIN_BASIC_USER;
const ORIGINAL_PASS = process.env.ADMIN_BASIC_PASSWORD;

afterEach(() => {
  if (ORIGINAL_USER === undefined) delete process.env.ADMIN_BASIC_USER;
  else process.env.ADMIN_BASIC_USER = ORIGINAL_USER;
  if (ORIGINAL_PASS === undefined) delete process.env.ADMIN_BASIC_PASSWORD;
  else process.env.ADMIN_BASIC_PASSWORD = ORIGINAL_PASS;
});

describe("HTTP Basic auth for /admin", () => {
  it("is disabled when credentials are unset (dev / e2e default)", () => {
    delete process.env.ADMIN_BASIC_USER;
    delete process.env.ADMIN_BASIC_PASSWORD;
    expect(basicAuthEnabled()).toBe(false);
    expect(verifyBasicAuthHeader(null)).toBe(true);
  });

  it("accepts a matching Authorization header when enabled", () => {
    process.env.ADMIN_BASIC_USER = "gate";
    process.env.ADMIN_BASIC_PASSWORD = "s3cret";
    expect(basicAuthEnabled()).toBe(true);
    const header = `Basic ${btoa("gate:s3cret")}`;
    expect(verifyBasicAuthHeader(header)).toBe(true);
  });

  it("rejects wrong password, missing header, and malformed header", () => {
    process.env.ADMIN_BASIC_USER = "gate";
    process.env.ADMIN_BASIC_PASSWORD = "s3cret";
    expect(verifyBasicAuthHeader(null)).toBe(false);
    expect(verifyBasicAuthHeader("Basic " + btoa("gate:wrong"))).toBe(false);
    expect(verifyBasicAuthHeader("Bearer token")).toBe(false);
  });
});

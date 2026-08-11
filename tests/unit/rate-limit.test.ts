import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

// The limiter is a module-level Map, so reset it between tests by using
// distinct keys - or by relying on fresh module state per test file run.
describe("checkRateLimit (SECURITY.md §3 - 5 attempts/minute per email+IP)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first 5 attempts and blocks the 6th", () => {
    const key = "login:a@b.c|127.0.0.1";
    const results = Array.from({ length: 6 }, () => checkRateLimit(key));
    expect(results).toEqual([true, true, true, true, true, false]);
  });

  it("counts per key - another email is unaffected", () => {
    checkRateLimit("login:a@b.c|127.0.0.1");
    checkRateLimit("login:a@b.c|127.0.0.1");
    checkRateLimit("login:a@b.c|127.0.0.1");
    checkRateLimit("login:a@b.c|127.0.0.1");
    checkRateLimit("login:a@b.c|127.0.0.1");
    expect(checkRateLimit("login:a@b.c|127.0.0.1")).toBe(false);
    expect(checkRateLimit("login:b@b.c|127.0.0.1")).toBe(true);
  });

  it("lets the window expire: attempts after 60s are allowed again", () => {
    const key = "login:a@b.c|127.0.0.1";
    for (let i = 0; i < 5; i++) checkRateLimit(key);
    expect(checkRateLimit(key)).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(checkRateLimit(key)).toBe(true);
  });
});

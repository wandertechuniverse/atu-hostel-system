import { describe, expect, it } from "vitest";
import {
  buildResetUrl,
  generateResetToken,
  hashResetToken,
  isTokenExpired,
  RESET_TOKEN_TTL_MS,
} from "@/lib/password-reset";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validation";

describe("reset token helpers", () => {
  it("generates 256 bits of entropy and hashes one-way", () => {
    const a = generateResetToken();
    const b = generateResetToken();
    expect(a).toHaveLength(64);
    expect(a).not.toBe(b);

    const hash = hashResetToken(a);
    expect(hash).toHaveLength(64);
    expect(hash).toBe(hashResetToken(a)); // deterministic
    expect(hash).not.toBe(a); // one-way, never the raw token
  });

  it("marks tokens expired at and after the TTL", () => {
    const now = new Date("2026-08-09T12:00:00Z");
    const future = new Date(now.getTime() + RESET_TOKEN_TTL_MS);
    expect(isTokenExpired(future, now)).toBe(false);
    expect(isTokenExpired(now, now)).toBe(true);
    expect(isTokenExpired(new Date(now.getTime() - 1000), now)).toBe(true);
  });

  it("builds a reset URL carrying the token", () => {
    const url = buildResetUrl("http://localhost:3000", "abc123");
    expect(url).toBe("http://localhost:3000/reset-password?token=abc123");
  });
});

describe("forgotPasswordSchema", () => {
  it("accepts a valid email and rejects a malformed one", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: "" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("accepts a token with matching 8-char passwords", () => {
    const result = resetPasswordSchema.safeParse({
      token: "t0ken",
      newPassword: "brand-new-pass",
      confirmPassword: "brand-new-pass",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a mismatched confirm (server-side check) and short passwords", () => {
    const mismatch = resetPasswordSchema.safeParse({
      token: "t0ken",
      newPassword: "brand-new-pass",
      confirmPassword: "different-pass",
    });
    expect(mismatch.success).toBe(false);
    expect(mismatch.error?.issues[0]?.path).toContain("confirmPassword");

    const short = resetPasswordSchema.safeParse({
      token: "t0ken",
      newPassword: "short",
      confirmPassword: "short",
    });
    expect(short.success).toBe(false);
  });

  it("rejects a missing token", () => {
    const missing = resetPasswordSchema.safeParse({
      token: "",
      newPassword: "brand-new-pass",
      confirmPassword: "brand-new-pass",
    });
    expect(missing.success).toBe(false);
  });
});

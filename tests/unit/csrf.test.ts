import { describe, expect, it } from "vitest";
import { signCsrfToken, verifyCsrfToken } from "@/lib/csrf-token";

const SECRET = "unit-test-session-secret-at-least-32-chars!!";

describe("signed JWT CSRF tokens", () => {
  it("accepts a freshly signed token", async () => {
    const token = await signCsrfToken(SECRET);
    expect(await verifyCsrfToken(token, SECRET)).toBe(true);
  });

  it("rejects a tampered payload", async () => {
    const token = await signCsrfToken(SECRET);
    const [h, p, s] = token.split(".");
    // Flip a character in the payload segment.
    const flipped =
      p.slice(0, -1) + (p.endsWith("A") ? "B" : "A");
    expect(await verifyCsrfToken(`${h}.${flipped}.${s}`, SECRET)).toBe(false);
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signCsrfToken(SECRET);
    expect(await verifyCsrfToken(token, "other-secret-not-the-same-value!!!")).toBe(
      false,
    );
  });

  it("rejects empty / garbage input", async () => {
    expect(await verifyCsrfToken("", SECRET)).toBe(false);
    expect(await verifyCsrfToken("not.a.jwt", SECRET)).toBe(false);
  });
});

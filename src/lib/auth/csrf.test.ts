import { afterEach, describe, expect, it } from "vitest";
import {
  createCsrfToken,
  isCsrfTokenExpired,
  verifyCsrfToken,
} from "./csrf";

const originalAuthSecret = process.env.AUTH_SECRET;

afterEach(() => {
  process.env.AUTH_SECRET = originalAuthSecret;
});

describe("csrf", () => {
  it("creates and verifies csrf token", async () => {
    process.env.AUTH_SECRET = "test-csrf-secret-key-123456";
    const token = await createCsrfToken();
    const result = await verifyCsrfToken(token);
    expect(result.valid).toBe(true);
  });

  it("rejects invalid token", async () => {
    process.env.AUTH_SECRET = "test-csrf-secret-key-123456";
    const result = await verifyCsrfToken("invalid.token.value");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("invalid");
  });

  it("rejects expired token", async () => {
    process.env.AUTH_SECRET = "test-csrf-secret-key-123456";
    const token = await createCsrfToken();
    expect(isCsrfTokenExpired(token)).toBe(false);

    const expiredToken = token.split(".").slice(0, 2).join(".") + ".invalid";
    const expiredResult = await verifyCsrfToken(expiredToken);
    expect(expiredResult.valid).toBe(false);
  });

  it("detects expiry from token payload", async () => {
    process.env.AUTH_SECRET = "test-csrf-secret-key-123456";
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const token = await new SignJWT({ purpose: "csrf" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(new Date(Date.now() - 1000))
      .sign(secret);

    expect(isCsrfTokenExpired(token)).toBe(true);
    const result = await verifyCsrfToken(token);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("expired");
  });
});

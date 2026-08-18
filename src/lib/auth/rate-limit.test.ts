import { afterEach, describe, expect, it } from "vitest";
import {
  AUTH_RATE_WINDOW_MS,
  checkAuthRateLimit,
  clearRateLimitsForTests,
  resetAuthUserRateLimit,
} from "@/lib/auth/rate-limit";

describe("checkAuthRateLimit", () => {
  afterEach(() => {
    clearRateLimitsForTests();
  });

  it("blocks login after per-user limit", () => {
    for (let i = 0; i < 5; i += 1) {
      expect(checkAuthRateLimit("login", "Alice", "1.2.3.4").allowed).toBe(true);
    }

    const blocked = checkAuthRateLimit("login", "Alice", "1.2.3.4");
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.scope).toBe("user");
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
      expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(
        AUTH_RATE_WINDOW_MS / 1000,
      );
    }
  });

  it("blocks login after per-ip limit across usernames", () => {
    for (let i = 0; i < 20; i += 1) {
      expect(
        checkAuthRateLimit("login", `user${i}`, "9.9.9.9").allowed,
      ).toBe(true);
    }

    const blocked = checkAuthRateLimit("login", "user999", "9.9.9.9");
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.scope).toBe("ip");
    }
  });

  it("skips ip limit when ip is missing", () => {
    for (let i = 0; i < 25; i += 1) {
      expect(checkAuthRateLimit("login", `solo${i}`).allowed).toBe(true);
    }
  });

  it("resets only the user bucket on success", () => {
    for (let i = 0; i < 5; i += 1) {
      checkAuthRateLimit("login", "bob", "1.1.1.1");
    }
    expect(checkAuthRateLimit("login", "bob", "1.1.1.1").allowed).toBe(false);

    resetAuthUserRateLimit("login", "bob");
    expect(checkAuthRateLimit("login", "bob", "1.1.1.1").allowed).toBe(true);
  });
});

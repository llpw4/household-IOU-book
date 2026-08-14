import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { withBasePath } from "@/lib/base-path";

const PUBLIC_PATHS = ["/login", "/register"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function buildLoginRedirectUrl(pathname: string, origin = "http://localhost:3000/jiehuanben/") {
  const loginUrl = new URL(withBasePath("/login"), origin);
  if (pathname !== "/") {
    loginUrl.searchParams.set("next", pathname);
  }
  return loginUrl.toString();
}

describe("proxy route protection", () => {
  beforeEach(() => {
    vi.stubEnv("BASE_PATH", "/jiehuanben");
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/jiehuanben");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("treats login and register as public paths", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/register")).toBe(true);
  });

  it("treats main app routes as protected", () => {
    for (const path of ["/", "/records", "/charts", "/parties", "/settings/data"]) {
      expect(isPublicPath(path)).toBe(false);
    }
  });

  it("redirects protected pages to login with base path and next param", () => {
    expect(buildLoginRedirectUrl("/records")).toBe(
      "http://localhost:3000/jiehuanben/login?next=%2Frecords",
    );
    expect(buildLoginRedirectUrl("/")).toBe("http://localhost:3000/jiehuanben/login");
  });
});

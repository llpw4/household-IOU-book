import { describe, expect, it } from "vitest";

const PUBLIC_PATHS = ["/login", "/register"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function buildLoginRedirectUrl(pathname: string, origin = "http://localhost:3000") {
  const loginUrl = new URL("/login", origin);
  if (pathname !== "/") {
    loginUrl.searchParams.set("next", pathname);
  }
  return loginUrl.toString();
}

describe("proxy route protection", () => {
  it("treats login and register as public paths", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/register")).toBe(true);
  });

  it("treats main app routes as protected", () => {
    for (const path of ["/", "/records", "/charts", "/parties", "/settings/data"]) {
      expect(isPublicPath(path)).toBe(false);
    }
  });

  it("redirects protected pages to login with next param", () => {
    expect(buildLoginRedirectUrl("/records")).toBe(
      "http://localhost:3000/login?next=%2Frecords",
    );
    expect(buildLoginRedirectUrl("/")).toBe("http://localhost:3000/login");
  });
});

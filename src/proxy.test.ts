import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createAppRedirectUrl, withBasePath } from "@/lib/base-path";

const PUBLIC_PATHS = ["/login", "/register"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
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

  it("builds login redirect URLs with nextUrl basePath support", () => {
    const request = new NextRequest(new URL("http://localhost:3000/jiehuanben/records"));

    expect(createAppRedirectUrl(request, "/login", { searchParams: { next: "/records" } }).toString()).toBe(
      "http://localhost:3000/jiehuanben/login?next=%2Frecords",
    );
    expect(createAppRedirectUrl(new NextRequest(new URL("http://localhost:3000/jiehuanben/")), "/login").toString()).toBe(
      "http://localhost:3000/jiehuanben/login",
    );
  });

  it("prefixes raw API links for client-side fetch", () => {
    expect(withBasePath("/api/export/analysis")).toBe("/jiehuanben/api/export/analysis");
  });
});

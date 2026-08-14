import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  getBasePath,
  getSessionCookiePath,
  normalizeBasePath,
  withBasePath,
} from "./base-path";

describe("normalizeBasePath", () => {
  it("normalizes trailing slashes and missing leading slash", () => {
    expect(normalizeBasePath("/jiehuanben/")).toBe("/jiehuanben");
    expect(normalizeBasePath("jiehuanben")).toBe("/jiehuanben");
  });

  it("returns empty string for blank values", () => {
    expect(normalizeBasePath("")).toBe("");
    expect(normalizeBasePath(undefined)).toBe("");
  });
});

describe("base path helpers", () => {
  beforeEach(() => {
    vi.stubEnv("BASE_PATH", "/jiehuanben");
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/jiehuanben");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads base path from env", () => {
    expect(getBasePath()).toBe("/jiehuanben");
  });

  it("prefixes app routes with the configured base path", () => {
    expect(withBasePath("/api/export")).toBe("/jiehuanben/api/export");
    expect(withBasePath("/login")).toBe("/jiehuanben/login");
  });

  it("leaves absolute URLs unchanged", () => {
    expect(withBasePath("https://example.com/api/export")).toBe(
      "https://example.com/api/export",
    );
  });

  it("scopes cookies to the base path when configured", () => {
    expect(getSessionCookiePath()).toBe("/jiehuanben");
  });
});

describe("root deployment", () => {
  beforeEach(() => {
    vi.stubEnv("BASE_PATH", "");
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses site root when BASE_PATH is empty", () => {
    expect(getBasePath()).toBe("");
    expect(withBasePath("/login")).toBe("/login");
    expect(getSessionCookiePath()).toBe("/");
  });
});

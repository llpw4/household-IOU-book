import { describe, expect, it } from "vitest";
import {
  DEFAULT_BASE_PATH,
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

describe("withBasePath", () => {
  it("prefixes app routes with the configured base path", () => {
    expect(withBasePath("/api/export")).toBe(`${DEFAULT_BASE_PATH}/api/export`);
    expect(withBasePath("/login")).toBe(`${DEFAULT_BASE_PATH}/login`);
  });

  it("leaves absolute URLs unchanged", () => {
    expect(withBasePath("https://example.com/api/export")).toBe(
      "https://example.com/api/export",
    );
  });
});

describe("getSessionCookiePath", () => {
  it("scopes cookies to the base path when configured", () => {
    expect(getSessionCookiePath()).toBe(DEFAULT_BASE_PATH);
  });
});

import { describe, expect, it } from "vitest";
import {
  isHttpsProto,
  parseCookieSecureEnvValue,
  resolveSessionCookieSecureSync,
} from "./session";

describe("session cookie secure", () => {
  it("honors explicit COOKIE_SECURE env", () => {
    expect(
      resolveSessionCookieSecureSync({
        nodeEnv: "production",
        cookieSecureEnv: "false",
        forwardedProto: "https",
      }),
    ).toBe(false);

    expect(
      resolveSessionCookieSecureSync({
        nodeEnv: "development",
        cookieSecureEnv: "true",
        forwardedProto: null,
      }),
    ).toBe(true);
  });

  it("disables secure cookies in development", () => {
    expect(
      resolveSessionCookieSecureSync({
        nodeEnv: "development",
        forwardedProto: "https",
      }),
    ).toBe(false);
  });

  it("uses forwarded proto in production", () => {
    expect(
      resolveSessionCookieSecureSync({
        nodeEnv: "production",
        forwardedProto: "https",
      }),
    ).toBe(true);

    expect(
      resolveSessionCookieSecureSync({
        nodeEnv: "production",
        forwardedProto: "http",
      }),
    ).toBe(false);
  });

  it("defaults to false in production without forwarded proto", () => {
    expect(
      resolveSessionCookieSecureSync({
        nodeEnv: "production",
        forwardedProto: null,
      }),
    ).toBe(false);
  });

  it("parses cookie secure env values", () => {
    expect(parseCookieSecureEnvValue(" true ")).toBe(true);
    expect(parseCookieSecureEnvValue("FALSE")).toBe(false);
    expect(parseCookieSecureEnvValue(undefined)).toBeUndefined();
  });

  it("detects https forwarded proto", () => {
    expect(isHttpsProto("https")).toBe(true);
    expect(isHttpsProto("HTTPS, http")).toBe(true);
    expect(isHttpsProto("http")).toBe(false);
    expect(isHttpsProto(null)).toBe(false);
  });
});

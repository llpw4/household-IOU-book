import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  CAPTCHA_CODE_LENGTH,
  createCaptchaToken,
  generateCaptchaCode,
  normalizeCaptchaAnswer,
  renderCaptchaSvg,
  verifyCaptchaPair,
} from "@/lib/auth/captcha";

describe("captcha", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "test-secret-at-least-16-chars");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("generates numeric code of expected length", () => {
    const code = generateCaptchaCode();
    expect(code).toHaveLength(CAPTCHA_CODE_LENGTH);
    expect(/^\d+$/.test(code)).toBe(true);
  });

  it("normalizes captcha answer whitespace", () => {
    expect(normalizeCaptchaAnswer(" 12 34 ")).toBe("1234");
  });

  it("renders svg containing digits", () => {
    const svg = renderCaptchaSvg("4821");
    expect(svg).toContain("<svg");
    for (const digit of "4821") {
      expect(svg).toContain(`>${digit}<`);
    }
  });

  it("accepts matching token and answer", async () => {
    const token = await createCaptchaToken("7392");
    expect(await verifyCaptchaPair(token, "7392")).toBe(true);
    expect(await verifyCaptchaPair(token, "0000")).toBe(false);
  });
});

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { errors, jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { getSessionCookiePath } from "@/lib/base-path";
import { resolveSessionCookieSecure } from "@/lib/auth/session";

export const CAPTCHA_COOKIE = "jiehuanben_captcha";
export const CAPTCHA_MAX_AGE_SECONDS = 5 * 60;
export const CAPTCHA_CODE_LENGTH = 4;
export const CAPTCHA_INVALID_MESSAGE = "验证码错误或已失效，请点击图片刷新后重试";

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET 未配置或长度不足，请在 .env.local 中设置至少 16 位随机字符串");
  }
  return new TextEncoder().encode(secret);
}

export function generateCaptchaCode(length = CAPTCHA_CODE_LENGTH): string {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += String(randomInt(0, 10));
  }
  return code;
}

export function normalizeCaptchaAnswer(input: string): string {
  return input.replace(/\s/g, "").trim();
}

function compareCaptchaAnswer(expected: string, actual: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(actual, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function createCaptchaToken(code: string): Promise<string> {
  return new SignJWT({ purpose: "captcha", code })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CAPTCHA_MAX_AGE_SECONDS}s`)
    .sign(getAuthSecret());
}

export async function verifyCaptchaToken(
  token: string,
): Promise<{ valid: true; code: string } | { valid: false }> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret(), {
      clockTolerance: 0,
    });
    if (payload.purpose !== "captcha" || typeof payload.code !== "string") {
      return { valid: false };
    }
    return { valid: true, code: payload.code };
  } catch (error) {
    if (error instanceof errors.JWTExpired || error instanceof errors.JWTInvalid) {
      return { valid: false };
    }
    throw error;
  }
}

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 生成带干扰线的数字 SVG 验证码图 */
export function renderCaptchaSvg(code: string): string {
  const width = 120;
  const height = 44;
  const chars = code.split("");
  const lines: string[] = [];

  for (let i = 0; i < 6; i += 1) {
    const x1 = randomInt(0, width);
    const y1 = randomInt(0, height);
    const x2 = randomInt(0, width);
    const y2 = randomInt(0, height);
    const stroke = `hsl(${randomInt(0, 360)} 30% 70%)`;
    lines.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="1" opacity="0.7"/>`,
    );
  }

  const glyphs = chars
    .map((char, index) => {
      const x = 14 + index * 26 + randomInt(-2, 3);
      const y = 28 + randomInt(-3, 4);
      const rotate = randomInt(-18, 18);
      const fill = `hsl(${randomInt(200, 260)} 45% 35%)`;
      return `<text x="${x}" y="${y}" fill="${fill}" font-size="26" font-family="ui-monospace, monospace" font-weight="700" transform="rotate(${rotate} ${x} ${y})">${escapeSvgText(char)}</text>`;
    })
    .join("");

  const noise = Array.from({ length: 24 }, () => {
    const cx = randomInt(0, width);
    const cy = randomInt(0, height);
    return `<circle cx="${cx}" cy="${cy}" r="1" fill="hsl(220 20% 60%)" opacity="0.8"/>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="验证码">
  <rect width="100%" height="100%" fill="#f5f5f4" rx="6"/>
  ${lines.join("\n  ")}
  ${noise}
  ${glyphs}
</svg>`;
}

export function getCaptchaCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: getSessionCookiePath(),
    maxAge: CAPTCHA_MAX_AGE_SECONDS,
  };
}

export async function clearCaptchaCookie(): Promise<void> {
  const cookieStore = await cookies();
  const secure = await resolveSessionCookieSecure();
  cookieStore.delete({
    name: CAPTCHA_COOKIE,
    path: getSessionCookiePath(),
    secure,
  });
}

export async function verifyCaptchaAnswer(answer: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = normalizeCaptchaAnswer(answer);
  if (!normalized) {
    return { ok: false, error: "请输入验证码" };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(CAPTCHA_COOKIE)?.value;
  await clearCaptchaCookie();

  if (!token) {
    return { ok: false, error: CAPTCHA_INVALID_MESSAGE };
  }

  const verified = await verifyCaptchaToken(token);
  if (!verified.valid) {
    return { ok: false, error: CAPTCHA_INVALID_MESSAGE };
  }

  if (!compareCaptchaAnswer(verified.code, normalized)) {
    return { ok: false, error: CAPTCHA_INVALID_MESSAGE };
  }

  return { ok: true };
}

/** 供单元测试：无 Cookie 时直接校验 token 与答案 */
export async function verifyCaptchaPair(
  token: string,
  answer: string,
): Promise<boolean> {
  const verified = await verifyCaptchaToken(token);
  if (!verified.valid) {
    return false;
  }
  return compareCaptchaAnswer(verified.code, normalizeCaptchaAnswer(answer));
}

/** 干扰 OCR 的简单签名（非安全边界，答案在 JWT 中） */
export function captchaImageEtag(code: string): string {
  return createHmac("sha256", getAuthSecret()).update(code).digest("hex").slice(0, 16);
}

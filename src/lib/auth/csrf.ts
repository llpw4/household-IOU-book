import { decodeJwt, errors, SignJWT, jwtVerify } from "jose";

export const CSRF_MAX_AGE_SECONDS = 60 * 60;

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET 未配置或长度不足，请在 .env.local 中设置至少 16 位随机字符串");
  }
  return new TextEncoder().encode(secret);
}

export type CsrfVerifyResult =
  | { valid: true }
  | { valid: false; reason: "expired" | "invalid" };

export async function createCsrfToken(): Promise<string> {
  const expiresAt = new Date(Date.now() + CSRF_MAX_AGE_SECONDS * 1000);

  return new SignJWT({ purpose: "csrf" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getAuthSecret());
}

export async function verifyCsrfToken(token: string): Promise<CsrfVerifyResult> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret(), {
      clockTolerance: 0,
    });

    if (payload.purpose !== "csrf") {
      return { valid: false, reason: "invalid" };
    }

    return { valid: true };
  } catch (error) {
    if (error instanceof errors.JWTExpired) {
      return { valid: false, reason: "expired" };
    }
    return { valid: false, reason: "invalid" };
  }
}

/** 客户端读取 JWT 过期时间，不验证签名 */
export function getCsrfTokenExpiresAt(token: string): number | null {
  try {
    const payload = decodeJwt(token);
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isCsrfTokenExpired(
  token: string,
  skewMs = 0,
): boolean {
  const expiresAt = getCsrfTokenExpiresAt(token);
  if (!expiresAt) return true;
  return Date.now() >= expiresAt - skewMs;
}

export const CSRF_EXPIRED_MESSAGE =
  "页面打开时间过长，安全令牌已过期，请点击「刷新令牌」后重新提交";

export const CSRF_INVALID_MESSAGE = "请求无效，请刷新页面后重试";

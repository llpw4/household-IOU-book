import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { getSessionCookiePath } from "@/lib/base-path";

export const SESSION_COOKIE = "jiehuanben_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60;

export function parseCookieSecureEnvValue(
  value: string | undefined,
): boolean | undefined {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return undefined;
}

export function isHttpsProto(proto: string | null | undefined): boolean {
  if (!proto) return false;
  return proto.split(",")[0]?.trim().toLowerCase() === "https";
}

export function resolveSessionCookieSecureSync(options: {
  nodeEnv?: string;
  cookieSecureEnv?: string;
  forwardedProto?: string | null;
}): boolean {
  const explicit = parseCookieSecureEnvValue(options.cookieSecureEnv);
  if (explicit !== undefined) return explicit;

  if (options.nodeEnv !== "production") return false;

  if (options.forwardedProto) {
    return isHttpsProto(options.forwardedProto);
  }

  return false;
}

/** 生产 HTTP 部署须 COOKIE_SECURE=false；HTTPS 反代应传 X-Forwarded-Proto */
export async function resolveSessionCookieSecure(): Promise<boolean> {
  const headerStore = await headers();
  return resolveSessionCookieSecureSync({
    nodeEnv: process.env.NODE_ENV,
    cookieSecureEnv: process.env.COOKIE_SECURE,
    forwardedProto:
      headerStore.get("x-forwarded-proto") ??
      headerStore.get("x-forwarded-protocol"),
  });
}

export interface SessionPayload {
  userId: string;
  username: string;
}

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET 未配置或长度不足，请在 .env.local 中设置至少 16 位随机字符串");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  payload: SessionPayload,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getAuthSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    if (
      typeof payload.userId !== "string" ||
      typeof payload.username !== "string"
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      username: payload.username,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();
  const secure = await resolveSessionCookieSecure();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: getSessionCookiePath(),
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const secure = await resolveSessionCookieSecure();
  cookieStore.delete({
    name: SESSION_COOKIE,
    path: getSessionCookiePath(),
    secure,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getSessionFromRequest(
  request: NextRequest,
): Promise<SessionPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

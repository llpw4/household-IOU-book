import { redirect } from "next/navigation";
import { verifyCsrfToken, CSRF_EXPIRED_MESSAGE, CSRF_INVALID_MESSAGE } from "@/lib/auth/csrf";
import { prisma } from "@/lib/db/client";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { checkAuthRateLimit, resetAuthUserRateLimit } from "@/lib/auth/rate-limit";
import {
  getSession,
  setSessionCookie,
  type SessionPayload,
} from "@/lib/auth/session";
import { logAuth } from "@/lib/logger";
import {
  validatePassword,
  validatePasswordConfirmation,
  validateUsername,
} from "@/lib/auth/validation";

export interface AuthUser {
  id: string;
  username: string;
}

export interface AuthRequestContext {
  ip?: string;
}

export const STALE_SESSION_RESET_PATH = "/api/auth/reset-session";

export async function requireUser(): Promise<AuthUser> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true },
  });

  if (!user) {
    redirect(STALE_SESSION_RESET_PATH);
  }

  return user;
}

export async function getOptionalUser(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true },
  });

  if (!user) {
    return null;
  }

  return user;
}

export async function registerUser(
  input: {
    username: string;
    password: string;
    confirmPassword: string;
    csrfToken?: string;
    honeypot?: string;
  },
  context: AuthRequestContext = {},
): Promise<{ error?: string }> {
  const username = input.username.trim();

  if (input.honeypot?.trim()) {
    logAuth("warn", "register.blocked", {
      username,
      ip: context.ip,
      message: "honeypot 触发",
    });
    return { error: "请求无效" };
  }

  const csrfError = await validateCsrfToken(input.csrfToken, {
    action: "register",
    username,
    ip: context.ip,
  });
  if (csrfError) return csrfError;

  const usernameError = validateUsername(input.username);
  if (usernameError) {
    logAuth("warn", "register.failed", {
      username,
      ip: context.ip,
      message: usernameError,
    });
    return { error: usernameError };
  }

  const passwordError = validatePassword(input.password);
  if (passwordError) {
    logAuth("warn", "register.failed", {
      username,
      ip: context.ip,
      message: passwordError,
    });
    return { error: passwordError };
  }

  const confirmError = validatePasswordConfirmation(
    input.password,
    input.confirmPassword,
  );
  if (confirmError) {
    logAuth("warn", "register.failed", {
      username,
      ip: context.ip,
      message: confirmError,
    });
    return { error: confirmError };
  }

  const rate = checkAuthRateLimit("register", username, context.ip);
  if (!rate.allowed) {
    logAuth("warn", "register.rate_limited", {
      username,
      ip: context.ip,
      detail: `${rate.scope}:${rate.retryAfterSeconds}s`,
    });
    return { error: `注册尝试过于频繁，请 ${rate.retryAfterSeconds} 秒后再试` };
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    logAuth("warn", "register.failed", {
      username,
      ip: context.ip,
      message: "用户名已被占用",
    });
    return { error: "用户名已被占用" };
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { username, passwordHash },
    select: { id: true, username: true },
  });

  resetAuthUserRateLimit("register", username);
  await setSessionCookie({ userId: user.id, username: user.username });

  logAuth("info", "register.success", {
    username: user.username,
    userId: user.id,
    ip: context.ip,
    message: "注册并自动登录",
  });

  return {};
}

export async function loginUser(
  input: {
    username: string;
    password: string;
    csrfToken?: string;
    honeypot?: string;
  },
  context: AuthRequestContext = {},
): Promise<{ error?: string }> {
  const username = input.username.trim();

  if (input.honeypot?.trim()) {
    logAuth("warn", "login.blocked", {
      username,
      ip: context.ip,
      message: "honeypot 触发",
    });
    return { error: "请求无效" };
  }

  const csrfError = await validateCsrfToken(input.csrfToken, {
    action: "login",
    username,
    ip: context.ip,
  });
  if (csrfError) return csrfError;

  const usernameError = validateUsername(input.username);
  if (usernameError) {
    logAuth("warn", "login.failed", {
      username,
      ip: context.ip,
      message: usernameError,
    });
    return { error: usernameError };
  }

  if (!input.password) {
    logAuth("warn", "login.failed", {
      username,
      ip: context.ip,
      message: "密码为空",
    });
    return { error: "请输入密码" };
  }

  const rate = checkAuthRateLimit("login", username, context.ip);
  if (!rate.allowed) {
    logAuth("warn", "login.rate_limited", {
      username,
      ip: context.ip,
      detail: `${rate.scope}:${rate.retryAfterSeconds}s`,
    });
    return { error: `登录尝试过于频繁，请 ${rate.retryAfterSeconds} 秒后再试` };
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    logAuth("warn", "login.failed", {
      username,
      ip: context.ip,
      message: "用户不存在",
    });
    return { error: "用户名或密码错误" };
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    logAuth("warn", "login.failed", {
      username,
      userId: user.id,
      ip: context.ip,
      message: "密码错误",
    });
    return { error: "用户名或密码错误" };
  }

  resetAuthUserRateLimit("login", username);
  await setSessionCookie({ userId: user.id, username: user.username });

  logAuth("info", "login.success", {
    username: user.username,
    userId: user.id,
    ip: context.ip,
    message: "登录成功",
  });

  return {};
}

export async function logoutUser(context: AuthRequestContext = {}): Promise<void> {
  const session = await getSession();

  logAuth("info", "logout", {
    username: session?.username,
    userId: session?.userId,
    ip: context.ip,
    message: session ? "用户退出登录" : "未登录状态退出",
  });
}

export async function createUserAccount(
  username: string,
  plainPassword: string,
): Promise<AuthUser> {
  const passwordHash = await hashPassword(plainPassword);
  return prisma.user.create({
    data: {
      username,
      passwordHash,
    },
    select: { id: true, username: true },
  });
}

export async function checkUsernameAvailability(
  username: string,
): Promise<{ available: boolean; error?: string }> {
  const formatError = validateUsername(username);
  if (formatError) {
    return { available: false, error: formatError };
  }

  const trimmed = username.trim();
  const existing = await prisma.user.findUnique({ where: { username: trimmed } });
  if (existing) {
    return { available: false, error: "用户名已被占用" };
  }

  return { available: true };
}

export function toSessionPayload(user: AuthUser): SessionPayload {
  return { userId: user.id, username: user.username };
}

async function validateCsrfToken(
  token: string | undefined,
  context: { action: "login" | "register"; username: string; ip?: string },
): Promise<{ error?: string } | null> {
  if (!token?.trim()) {
    logAuth("warn", `${context.action}.csrf_invalid`, {
      username: context.username,
      ip: context.ip,
      message: "缺少 CSRF 令牌",
    });
    return { error: CSRF_INVALID_MESSAGE };
  }

  const result = await verifyCsrfToken(token);
  if (!result.valid) {
    logAuth("warn", `${context.action}.csrf_invalid`, {
      username: context.username,
      ip: context.ip,
      message: result.reason === "expired" ? "CSRF 令牌已过期" : "CSRF 校验失败",
    });
    return {
      error:
        result.reason === "expired" ? CSRF_EXPIRED_MESSAGE : CSRF_INVALID_MESSAGE,
    };
  }

  return null;
}

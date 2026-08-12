import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getClientIp, logAccess } from "@/lib/logger";

const PUBLIC_PATHS = ["/login", "/register", "/api/auth/reset-session"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function shouldLogAccess(pathname: string, method: string): boolean {
  if (method !== "GET") {
    return pathname.startsWith("/api/");
  }

  return !pathname.startsWith("/api/files/");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const ip = getClientIp(request.headers);
  const session = await getSessionFromRequest(request);

  if (isPublicPath(pathname)) {
    // 不在 proxy 层根据 JWT 重定向已登录用户：JWT 有效但用户已被删除时
    // 会与页面层 requireUser 形成 / ↔ /login 死循环。改由登录/注册页用 getOptionalUser 处理。
    if (pathname === "/login" || pathname === "/register") {
      logAccess("info", "auth_page.visit", {
        method,
        path: pathname,
        ip,
      });
    }

    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return response;
  }

  if (!session) {
    if (pathname.startsWith("/api/")) {
      logAccess("warn", "api.unauthorized", {
        method,
        path: pathname,
        ip,
        message: "未登录访问 API",
      });
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    logAccess("warn", "access.unauthenticated", {
      method,
      path: pathname,
      ip,
      message: "未登录访问受保护页面，重定向登录",
    });

    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (shouldLogAccess(pathname, method)) {
    logAccess("info", "access.authenticated", {
      method,
      path: pathname,
      username: session.username,
      userId: session.userId,
      ip,
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

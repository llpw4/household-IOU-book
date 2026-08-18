import type { NextRequest } from "next/server";

export function normalizeBasePath(value: string | undefined): string {
  if (!value?.trim()) {
    return "";
  }

  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function getBasePath(): string {
  return normalizeBasePath(
    process.env.NEXT_PUBLIC_BASE_PATH ?? process.env.BASE_PATH,
  );
}

export function withBasePath(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const basePath = getBasePath();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return basePath ? `${basePath}${normalized}` : normalized;
}

export function getSessionCookiePath(): string {
  const basePath = getBasePath();
  return basePath || "/";
}

function applySearchParams(
  url: URL,
  searchParams?: Record<string, string | undefined>,
): void {
  if (!searchParams) return;

  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }
}

/** Build redirects that honor Next.js basePath from next.config and BASE_PATH env. */
export function createAppRedirectUrl(
  request: NextRequest,
  pathname: string,
  options?: { searchParams?: Record<string, string | undefined> },
): URL {
  const basePath = getBasePath();
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  applySearchParams(url, options?.searchParams);

  const resolvedPath = withBasePath(pathname);
  if (basePath && !url.pathname.startsWith(basePath)) {
    const fallback = new URL(resolvedPath, request.url);
    applySearchParams(fallback, options?.searchParams);
    return fallback;
  }

  return url;
}

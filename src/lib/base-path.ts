export const DEFAULT_BASE_PATH = "/jiehuanben";

export function normalizeBasePath(value: string | undefined): string {
  if (!value?.trim()) {
    return "";
  }

  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function getBasePath(): string {
  return normalizeBasePath(
    process.env.NEXT_PUBLIC_BASE_PATH ?? process.env.BASE_PATH ?? DEFAULT_BASE_PATH,
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

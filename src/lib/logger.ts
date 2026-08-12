export type LogLevel = "info" | "warn" | "error";

export type LogCategory = "auth" | "access" | "api";

const BEIJING_TIME_ZONE = "Asia/Shanghai";

export interface LogPayload {
  category: LogCategory;
  event: string;
  message?: string;
  username?: string;
  userId?: string;
  path?: string;
  method?: string;
  ip?: string;
  detail?: string;
}

/** 格式化为北京时间，便于后台日志阅读 */
export function formatLogTimestamp(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BEIJING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

function formatLine(level: LogLevel, payload: LogPayload): string {
  const parts = [
    `[${formatLogTimestamp()}]`,
    `[${level.toUpperCase()}]`,
    `[${payload.category}]`,
    payload.event,
  ];

  if (payload.method) parts.push(`method=${payload.method}`);
  if (payload.path) parts.push(`path=${payload.path}`);
  if (payload.username) parts.push(`user=${payload.username}`);
  if (payload.userId) parts.push(`userId=${payload.userId}`);
  if (payload.ip) parts.push(`ip=${payload.ip}`);
  if (payload.message) parts.push(`msg=${payload.message}`);
  if (payload.detail) parts.push(`detail=${payload.detail}`);

  return parts.join(" ");
}

export function appLog(level: LogLevel, payload: LogPayload): void {
  const line = formatLine(level, payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function logAuth(
  level: LogLevel,
  event: string,
  fields: Omit<LogPayload, "category" | "event"> = {},
): void {
  appLog(level, { category: "auth", event, ...fields });
}

export function logAccess(
  level: LogLevel,
  event: string,
  fields: Omit<LogPayload, "category" | "event"> = {},
): void {
  appLog(level, { category: "access", event, ...fields });
}

export function logApi(
  level: LogLevel,
  event: string,
  fields: Omit<LogPayload, "category" | "event"> = {},
): void {
  appLog(level, { category: "api", event, ...fields });
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return headers.get("x-real-ip") ?? "unknown";
}

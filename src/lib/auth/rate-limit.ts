type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

export const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000;

const AUTH_RATE_LIMITS = {
  login: { perUser: 5, perIp: 20 },
  register: { perUser: 5, perIp: 10 },
} as const;

export type AuthRateAction = keyof typeof AUTH_RATE_LIMITS;

export type AuthRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number; scope: "user" | "ip" };

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= maxAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  buckets.set(key, entry);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/** Enforce per-username and per-IP limits for login/register. */
export function checkAuthRateLimit(
  action: AuthRateAction,
  username: string,
  ip?: string,
): AuthRateLimitResult {
  const limits = AUTH_RATE_LIMITS[action];
  const userKey = `${action}:${username.toLowerCase()}`;
  const userRate = checkRateLimit(userKey, limits.perUser, AUTH_RATE_WINDOW_MS);
  if (!userRate.allowed) {
    return {
      allowed: false,
      retryAfterSeconds: userRate.retryAfterSeconds,
      scope: "user",
    };
  }

  if (ip) {
    const ipKey = `${action}:ip:${ip}`;
    const ipRate = checkRateLimit(ipKey, limits.perIp, AUTH_RATE_WINDOW_MS);
    if (!ipRate.allowed) {
      return {
        allowed: false,
        retryAfterSeconds: ipRate.retryAfterSeconds,
        scope: "ip",
      };
    }
  }

  return { allowed: true };
}

export function resetAuthUserRateLimit(
  action: AuthRateAction,
  username: string,
): void {
  resetRateLimit(`${action}:${username.toLowerCase()}`);
}

/** @internal Test helper */
export function clearRateLimitsForTests(): void {
  buckets.clear();
}

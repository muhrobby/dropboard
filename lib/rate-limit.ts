import { redis } from "./redis";

/**
 * Rate Limiter untuk API endpoints
 *
 * Modul ini menyediakan rate limiting untuk mencegah:
 * - Brute force attacks pada login
 * - DoS (Denial of Service) attacks
 * - Spam dan abuse
 *
 * Menggunakan Redis jika tersedia, fallback ke in-memory storage untuk development.
 */

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Jumlah request maksimum dalam window time */
  limit: number;
  /** Window time dalam milliseconds */
  windowMs: number;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  /** Apakah request diizinkan */
  success: boolean;
  /** Sisa request quota */
  remaining: number;
  /** Timestamp ketika quota akan reset (ms) */
  resetAt: number;
}

/**
 * Rate limit error
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfter: number
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * In-memory storage untuk rate limit data (Fallback)
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now >= value.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}

export const DEFAULT_RATE_LIMITS = {
  auth: { limit: 5, windowMs: 60 * 1000 }, // 5 requests per minute
  api: { limit: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  upload: { limit: 10, windowMs: 60 * 1000 }, // 10 uploads per minute
  public: { limit: 20, windowMs: 60 * 1000 }, // 20 requests per minute
} as const;

/**
 * Check rate limit for a specific identifier, utilizing Redis if available
 */
export async function checkRateLimitAsync(
  identifier: string,
  configName: keyof typeof DEFAULT_RATE_LIMITS
): Promise<RateLimitResult> {
  const config = DEFAULT_RATE_LIMITS[configName];
  const now = Date.now();
  const resetAt = now + config.windowMs;

  if (redis) {
    const key = `ratelimit:${configName}:${identifier}`;
    
    // Simple sliding/fixed window approach with redis
    const currentCount = await redis.incr(key);
    
    if (currentCount === 1) {
      // First request in this window, set expiry
      await redis.pexpire(key, config.windowMs);
    }

    if (currentCount > config.limit) {
      const ttl = await redis.pttl(key);
      throw new RateLimitError(
        `Rate limit exceeded. Please try again later.`,
        now + (ttl > 0 ? ttl : config.windowMs)
      );
    }

    return {
      success: true,
      remaining: Math.max(0, config.limit - currentCount),
      resetAt: now + config.windowMs
    };
  }

  // Fallback to in-memory
  const entry = rateLimitStore.get(`${configName}:${identifier}`);

  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(`${configName}:${identifier}`, { count: 1, resetAt });
    return { success: true, remaining: config.limit - 1, resetAt };
  }

  if (entry.count >= config.limit) {
    throw new RateLimitError(
      `Rate limit exceeded. Please try again later.`,
      entry.resetAt
    );
  }

  entry.count++;
  return { success: true, remaining: config.limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Sync version for backwards compatibility (only uses in-memory)
 * Deprecated: Migrate to async version to support Redis.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now >= entry.resetAt) {
    const resetAt = now + config.windowMs;
    rateLimitStore.set(identifier, { count: 1, resetAt });
    return { success: true, remaining: config.limit - 1, resetAt };
  }

  if (entry.count >= config.limit) {
    throw new RateLimitError(`Rate limit exceeded. Please try again later.`, entry.resetAt);
  }

  entry.count++;
  return { success: true, remaining: config.limit - entry.count, resetAt: entry.resetAt };
}

export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
  if (redis) {
    // Also try to reset common prefixes in Redis as best effort (async)
    redis.del(`ratelimit:auth:${identifier}`).catch(() => {});
    redis.del(`ratelimit:api:${identifier}`).catch(() => {});
    redis.del(`ratelimit:upload:${identifier}`).catch(() => {});
    redis.del(`ratelimit:public:${identifier}`).catch(() => {});
  }
}

export function getClientIP(request: Request): string {
  const headers = request.headers;
  const ipHeaders = [
    "cf-connecting-ip",
    "x-forwarded-for",
    "x-real-ip",
    "x-client-ip",
    "fly-client-ip",
  ];

  for (const header of ipHeaders) {
    const value = headers.get(header);
    if (value) {
      const ip = value.split(",")[0].trim();
      if (ip) return ip;
    }
  }

  return "unknown";
}

export const rateLimiters = {
  auth: (identifier: string) => checkRateLimitAsync(identifier, "auth"),
  api: (identifier: string) => checkRateLimitAsync(identifier, "api"),
  upload: (identifier: string) => checkRateLimitAsync(identifier, "upload"),
  public: (identifier: string) => checkRateLimitAsync(identifier, "public"),
};

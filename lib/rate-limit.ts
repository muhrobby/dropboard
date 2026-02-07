/**
 * Rate Limiter untuk API endpoints
 *
 * Modul ini menyediakan rate limiting untuk mencegah:
 * - Brute force attacks pada login
 * - DoS (Denial of Service) attacks
 * - Spam dan abuse
 *
 * Menggunakan in-memory storage dengan Map untuk development.
 * Untuk production, gunakan Redis-based solution seperti Upstash Redis.
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
 * In-memory storage untuk rate limit data
 *
 * Structure: Map<identifier, { count: number, resetAt: number }>
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Cleanup expired entries untuk prevent memory leak
 * Dipanggil secara periodic
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now >= value.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup setiap 5 menit
if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}

/**
 * Default rate limit configurations untuk berbagai endpoint types
 */
export const DEFAULT_RATE_LIMITS = {
  /** Strict rate limit untuk authentication endpoints */
  auth: {
    limit: 5,
    windowMs: 60 * 1000, // 5 requests per minute
  },
  /** Moderate rate limit untuk API endpoints */
  api: {
    limit: 100,
    windowMs: 60 * 1000, // 100 requests per minute
  },
  /** Strict rate limit untuk file upload */
  upload: {
    limit: 10,
    windowMs: 60 * 1000, // 10 uploads per minute
  },
  /** Generous rate limit untuk public endpoints */
  public: {
    limit: 20,
    windowMs: 60 * 1000, // 20 requests per minute
  },
} as const;

/**
 * Check rate limit untuk identifier tertentu
 *
 * @param identifier - Unique identifier untuk rate limiting (IP, userId, dll)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Jika tidak ada entry atau sudah expired, buat baru
  if (!entry || now >= entry.resetAt) {
    const resetAt = now + config.windowMs;
    rateLimitStore.set(identifier, { count: 1, resetAt });

    return {
      success: true,
      remaining: config.limit - 1,
      resetAt,
    };
  }

  // Cek apakah limit terlampaui
  if (entry.count >= config.limit) {
    throw new RateLimitError(
      `Rate limit exceeded. Please try again later.`,
      entry.resetAt
    );
  }

  // Increment counter
  entry.count++;

  return {
    success: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Reset rate limit untuk identifier tertentu (useful untuk testing)
 *
 * @param identifier - Identifier yang akan di-reset
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Get client IP address dari Next.js Request
 *
 * @param request - Next.js Request object
 * @returns Client IP address atau "unknown" jika tidak tersedia
 */
export function getClientIP(request: Request): string {
  // Cek berbagai headers yang biasanya berisi IP address
  const headers = request.headers;

  // Priority order untuk IP detection
  const ipHeaders = [
    "cf-connecting-ip", // Cloudflare
    "x-forwarded-for", // Standard proxy header
    "x-real-ip", // Nginx
    "x-client-ip", // Some proxies
    "fly-client-ip", // Fly.io
  ];

  for (const header of ipHeaders) {
    const value = headers.get(header);
    if (value) {
      // Jika multiple IPs (comma-separated), ambil yang pertama
      const ip = value.split(",")[0].trim();
      if (ip) {
        return ip;
      }
    }
  }

  return "unknown";
}

/**
 * Create a rate limit middleware helper untuk Next.js route handlers
 *
 * @param config - Rate limit configuration
 * @returns Function yang check rate limit
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async (request: Request): Promise<void> => {
    const ip = getClientIP(request);
    checkRateLimit(ip, config);
  };
}

/**
 * Rate limit helpers untuk berbagai use cases
 */
export const rateLimiters = {
  /** Check auth rate limit (login, register, dll) */
  auth: (identifier: string) =>
    checkRateLimit(identifier, DEFAULT_RATE_LIMITS.auth),

  /** Check API rate limit */
  api: (identifier: string) =>
    checkRateLimit(identifier, DEFAULT_RATE_LIMITS.api),

  /** Check upload rate limit */
  upload: (identifier: string) =>
    checkRateLimit(identifier, DEFAULT_RATE_LIMITS.upload),

  /** Check public endpoint rate limit */
  public: (identifier: string) =>
    checkRateLimit(identifier, DEFAULT_RATE_LIMITS.public),
};

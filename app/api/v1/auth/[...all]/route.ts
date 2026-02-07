import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { getClientIP, rateLimiters, RateLimitError } from "@/lib/rate-limit";

/**
 * Better Auth handler dengan rate limiting
 *
 * Rate limiting diterapkan untuk mencegah:
 * - Brute force attacks pada login
 * - Spam registration
 * - Password reset abuse
 *
 * Note: For now, we're using the default Better Auth handler.
 * Rate limiting should be implemented at the middleware level
 * or using a reverse proxy (nginx, cloudflare, etc) for production.
 *
 * TODO: Implement proper rate limiting integration with Better Auth
 */
export const { GET, POST } = toNextJsHandler(auth);

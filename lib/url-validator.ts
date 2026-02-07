/**
 * URL Validator for SSRF (Server-Side Request Forgery) Protection
 *
 * Modul ini menyediakan validasi URL untuk mencegah SSRF attacks.
 * Memastikan URL yang di-fetch tidak mengarah ke internal network atau
 * resources yang seharusnya tidak diakses.
 */

/**
 * Allowed URL schemes
 */
const ALLOWED_SCHEMES = ["http:", "https:"] as const;

/**
 * Blocked hostnames yang tidak boleh diakses
 */
const BLOCKED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  // Cloud metadata services
  "169.254.169.254",
  "metadata.google.internal",
] as const;

/**
 * Private IP range patterns untuk mendeteksi internal network access
 */
const PRIVATE_IP_PATTERNS = [
  // IPv4 private ranges
  /^10\./,                              // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,    // 172.16.0.0/12
  /^192\.168\./,                        // 192.168.0.0/16
  /^127\./,                             // 127.0.0.0/8 (loopback)
  /^169\.254\./,                        // 169.254.0.0/16 (link-local)
  /^0\./,                               // 0.0.0.0/8

  // IPv6 private ranges
  /^fe80:/i,                            // fe80::/10 (link-local)
  /^fc00:/i,                            // fc00::/7 (unique local)
  /^::1$/i,                             // ::1 (loopback)
  /^::ffff:(10|172\.(1[6-9]|2[0-9]|3[0-1])|192\.168)\./i, // IPv4-mapped IPv6 private
] as const;

/**
 * Custom error class untuk URL validation errors
 */
export class URLValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "URLValidationError";
  }
}

/**
 * Validasi apakah hostname adalah IP address private
 */
function isPrivateIP(hostname: string): boolean {
  // Hapus port jika ada
  const host = hostname.split(":")[0];

  // Cek hostname yang diblok
  if (BLOCKED_HOSTS.some((blocked) => host === blocked)) {
    return true;
  }

  // Cek private IP patterns
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(host));
}

/**
 * Validasi URL untuk mencegah SSRF attacks
 *
 * Fungsi ini melakukan validasi:
 * 1. URL format yang valid
 * 2. Scheme yang diizinkan (http/https only)
 * 3. Bukan internal/private IP address
 * 4. Bukan hostname yang diblok (localhost, metadata services, dll)
 *
 * @param url - URL yang akan divalidasi
 * @returns true jika URL aman, throw error jika tidak
 * @throws {URLValidationError} jika URL tidak valid atau tidak aman
 */
export function validateUrl(url: string): true {
  try {
    const parsed = new URL(url);

    // Validasi scheme
    if (!ALLOWED_SCHEMES.includes(parsed.protocol as any)) {
      throw new URLValidationError(
        `Invalid URL scheme: "${parsed.protocol}". Only HTTP and HTTPS are allowed.`
      );
    }

    // Validasi hostname
    const hostname = parsed.hostname;

    if (!hostname) {
      throw new URLValidationError("URL must have a valid hostname");
    }

    // Cek apakah hostname adalah private IP atau hostname yang diblok
    if (isPrivateIP(hostname)) {
      throw new URLValidationError(
        "Access to internal network resources is not allowed"
      );
    }

    // Validasi: hostname tidak boleh berupa IP address (opsional, comment jika ingin allow public IP)
    // if (/^[\d\.:]+$/.test(hostname)) {
    //   throw new URLValidationError("IP address access is not allowed");
    // }

    return true;
  } catch (error) {
    if (error instanceof URLValidationError) {
      throw error;
    }

    // Re-throw URL parsing errors
    throw new URLValidationError(
      `Invalid URL format: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Validasi URL dan return parsed URL jika aman
 * Convenience function yang menggabungkan validateUrl dan URL parsing
 *
 * @param url - URL yang akan divalidasi dan di-parse
 * @returns Parsed URL object
 * @throws {URLValidationError} jika URL tidak valid atau tidak aman
 */
export function parseSafeUrl(url: string): URL {
  validateUrl(url);
  return new URL(url);
}

/**
 * Cek apakah URL aman tanpa throw error
 *
 * @param url - URL yang akan dicek
 * @returns true jika URL aman, false jika tidak
 */
export function isUrlSafe(url: string): boolean {
  try {
    validateUrl(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitasi URL dengan memastikan protocol dan removing tracking params (opsional)
 *
 * @param url - URL yang akan disanitasi
 * @returns Sanitized URL string
 * @throws {URLValidationError} jika URL tidak valid atau tidak aman
 */
export function sanitizeUrl(url: string): string {
  const parsed = parseSafeUrl(url);

  // Force HTTPS jika possible (optional - comment jika tidak ingin force)
  // if (parsed.protocol === "http:") {
  //   parsed.protocol = "https:";
  // }

  return parsed.toString();
}

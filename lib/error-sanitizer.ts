/**
 * Error Message Sanitizer
 *
 * Modul ini menyediakan fungsi untuk sanitasi error messages
 * sebelum dikirim ke client. Ini mencegah information disclosure
 * yang bisa digunakan attacker untuk reconnaissance.
 *
 * Internal error details tetap di-log di server, tapi user
 * menerima pesan yang lebih generik.
 */

/**
 * Patterns yang mungkin mengandung sensitive information
 * dan harus di-sanitasi dari error messages
 */
const SENSITIVE_PATTERNS = [
  // Database error patterns
  /column\s+\w+\s+does\s+not\s+exist/gi,
  /table\s+\w+\s+does\s+not\s+exist/gi,
  /syntax\s+error\s+(at|near)/gi,
  /constraint\s+\w+/gi,
  /duplicate\s+key/gi,
  /foreign\s+key\s+constraint/gi,

  // File system paths
  /[\/\\][a-zA-Z0-9_\-\/\\]+\.(ts|js|json|sql|env)/g,
  /at\s+[^:\n]+:\d+:\d+/g, // File:line:column

  // Database connection strings
  /postgresql?:\/\/[^@]+@/g,
  /mysql?:\/\/[^@]+@/g,
  /mongodb:\/\/[^@]+@/g,

  // Environment variable references
  /process\.env\.\w+/g,
  /\$\{?\w+\}?/g,

  // Internal function names (potential information disclosure)
  /in\s+function\s+'[^']+'/g,
  /at\s+Array\.\w+/g,
  /at\s+Object\.\w+/g,
];

/**
 * Sanitize error message untuk client consumption
 *
 * @param message - Raw error message
 * @param options - Sanitization options
 * @returns Sanitized error message
 */
export function sanitizeErrorMessage(
  message: string,
  options: {
    /** Maximum length of sanitized message */
    maxLength?: number;
    /** Whether to replace sensitive patterns with generic text */
    redact?: boolean;
    /** Generic message to use for internal errors */
    genericMessage?: string;
  } = {}
): string {
  const {
    maxLength = 500,
    redact = true,
    genericMessage = "An error occurred. Please try again.",
  } = options;

  if (!message || typeof message !== "string") {
    return genericMessage;
  }

  let sanitized = message;

  // Redact sensitive patterns if enabled
  if (redact) {
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, "[REDACTED]");
    }
  }

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + "...";
  }

  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  // If message is now empty or just contains redactions, use generic
  if (!sanitized || sanitized === "[REDACTED]") {
    return genericMessage;
  }

  return sanitized;
}

/**
 * Sanitize error object untuk API response
 *
 * @param error - Error object
 * @param isProduction - Whether running in production
 * @returns Sanitized error info
 */
export function sanitizeErrorForResponse(
  error: Error | unknown,
  isProduction: boolean = process.env.NODE_ENV === "production"
): { code: string; message: string } {
  // Default error response
  const defaultResponse = {
    code: "INTERNAL_ERROR",
    message: isProduction
      ? "An unexpected error occurred. Please try again."
      : "An error occurred.",
  };

  if (!error || typeof error !== "object") {
    return defaultResponse;
  }

  // Extract error properties safely
  const err = error as Partial<Pick<Error, "message" | "name">> & Record<string, unknown>;

  // Get error code if available
  let code = (err.code as string | undefined) || err.name || "INTERNAL_ERROR";

  // Sanitize message
  let message = err.message || String(error);

  // In production, use sanitized message
  if (isProduction) {
    message = sanitizeErrorMessage(message, {
      genericMessage: getGenericErrorMessage(code),
    });
  }

  return { code, message };
}

/**
 * Get generic error message based on error code
 *
 * @param code - Error code
 * @returns Generic error message
 */
function getGenericErrorMessage(code: string): string {
  const genericMessages: Record<string, string> = {
    NOT_FOUND: "The requested resource was not found.",
    UNAUTHORIZED: "Authentication is required to access this resource.",
    FORBIDDEN: "You do not have permission to perform this action.",
    VALIDATION_ERROR: "The provided data is invalid.",
    QUOTA_EXCEEDED: "You have exceeded your storage quota.",
    RATE_LIMIT_EXCEEDED: "Too many requests. Please try again later.",
    FILE_VALIDATION_ERROR: "The file is invalid or not allowed.",
    URL_VALIDATION_ERROR: "The provided URL is invalid.",
  };

  return (
    genericMessages[code] ||
    genericMessages[code.split("_")[0]] || // Fallback to first part
    "An unexpected error occurred. Please try again."
  );
}

/**
 * Log error with context for debugging (server-side only)
 *
 * @param error - Error object
 * @param context - Additional context
 */
export function logError(error: Error | unknown, context?: Record<string, unknown>): void {
  // In development, log full error details
  if (process.env.NODE_ENV === "development") {
    console.error("[Error]", {
      error,
      context,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return;
  }

  // In production, log sanitized version
  console.error("[Error]", {
    code: error instanceof Error && "code" in error ? (error as { code: string }).code : "INTERNAL_ERROR",
    message: error instanceof Error ? sanitizeErrorMessage(error.message) : String(error),
    context,
  });
}

/**
 * Create a sanitized error response
 *
 * @param error - Error object
 * @param isProduction - Whether running in production
 * @returns Sanitized error object
 */
export function createSanitizedErrorResponse(
  error: Error | unknown,
  isProduction?: boolean
): { code: string; message: string } {
  // Log the error for debugging
  logError(error);

  // Return sanitized response
  return sanitizeErrorForResponse(error, isProduction);
}

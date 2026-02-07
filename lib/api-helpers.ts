import { NextResponse } from "next/server";
import { sanitizeErrorMessage, createSanitizedErrorResponse } from "@/lib/error-sanitizer";

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
  requestId?: string; // For error tracking
};

/**
 * Generate a unique request ID for error tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    { success: true, data },
    { status }
  );
}

export function createdResponse<T>(data: T) {
  return successResponse(data, 201);
}

export function paginatedResponse<T>(
  data: T[],
  meta: { page: number; limit: number; total: number }
) {
  return NextResponse.json<ApiResponse<T[]>>(
    { success: true, data, meta },
    { status: 200 }
  );
}

export function errorResponse(code: string, message: string, status = 400) {
  // Security: Sanitize error message in production to prevent information disclosure
  const isProduction = process.env.NODE_ENV === "production";
  const sanitizedMessage = isProduction
    ? sanitizeErrorMessage(message)
    : message;

  const requestId = isProduction ? generateRequestId() : undefined;

  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error: { code, message: sanitizedMessage },
      ...(requestId && { requestId }),
    },
    { status }
  );
}

export function notFoundResponse(message = "Resource not found") {
  return errorResponse("NOT_FOUND", message, 404);
}

export function unauthorizedResponse(message = "Unauthorized") {
  return errorResponse("UNAUTHORIZED", message, 401);
}

export function forbiddenResponse(message = "Forbidden") {
  return errorResponse("FORBIDDEN", message, 403);
}

export function validationErrorResponse(message: string) {
  return errorResponse("VALIDATION_ERROR", message, 422);
}

export function serverErrorResponse(message = "Internal server error") {
  return errorResponse("INTERNAL_ERROR", message, 500);
}

/**
 * Create error response from Error object with sanitization
 *
 * @param error - Error object
 * @param defaultCode - Default error code if not available
 * @returns NextResponse with sanitized error
 */
export function errorResponseFromException(
  error: Error | unknown,
  defaultCode: string = "INTERNAL_ERROR"
): NextResponse<ApiResponse> {
  const sanitized = createSanitizedErrorResponse(error);
  const statusCode =
    error instanceof Error && "statusCode" in error
      ? (error as { statusCode: number }).statusCode
      : 500;

  const requestId = process.env.NODE_ENV === "production" ? generateRequestId() : undefined;

  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error: sanitized,
      ...(requestId && { requestId }),
    },
    { status: statusCode }
  );
}

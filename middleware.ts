import { NextRequest, NextResponse } from "next/server";

/**
 * Check if user has a session token
 * Note: This is a simple check. Actual session validation happens
 * at the API level using Better Auth's built-in session management.
 *
 * We don't call auth.api.getSession() in middleware because:
 * 1. Middleware runs in edge runtime without database access
 * 2. Calling database from middleware causes performance issues
 * 3. Better Auth handles session validation in API routes automatically
 */
function hasSessionToken(request: NextRequest): boolean {
  return !!request.cookies.get("better-auth.session_token")?.value;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if user has a session token (simple check)
  const hasToken = hasSessionToken(request);

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = [
    "/drops",
    "/pinboard",
    "/search",
    "/team",
    "/activity",
    "/settings",
  ];

  const isProtectedPath = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isProtectedPath && !hasToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Auth routes - redirect to drops if already authenticated
  const authPaths = ["/login", "/register"];
  const isAuthPath = authPaths.some((path) => pathname === path);

  if (isAuthPath && hasToken) {
    return NextResponse.redirect(new URL("/drops", request.url));
  }

  // Root path - redirect based on auth
  if (pathname === "/") {
    if (hasToken) {
      return NextResponse.redirect(new URL("/drops", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/drops/:path*",
    "/pinboard/:path*",
    "/search/:path*",
    "/team/:path*",
    "/activity/:path*",
    "/settings/:path*",
  ],
};

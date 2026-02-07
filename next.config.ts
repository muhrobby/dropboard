import type { NextConfig } from "next";

/**
 * Allowed origins untuk CORS
 * Di production, set environment variable dengan domain yang diizinkan
 * Contoh: NEXT_PUBLIC_ALLOWED_ORIGINS=https://dropboard.app,https://www.dropboard.app
 */
const getAllowedOrigins = () => {
  const envOrigins = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(",").map((o) => o.trim());
  }
  // Development: allow localhost
  return [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ];
};

const ALLOWED_ORIGINS = getAllowedOrigins();

/**
 * Check if origin is allowed
 */
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some((allowed) => {
    // Exact match or subdomain match
    return origin === allowed || origin.endsWith(`.${allowed.replace(/^https?:\/\//, "")}`);
  });
}

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",

  // Trailing slash handling for compatibility
  trailingSlash: false,

  // Skip trailing slash redirect to avoid issues
  skipTrailingSlashRedirect: false,

  /* config options here */

  /**
   * Security Headers
   *
   * Menambahkan security headers untuk melindungi aplikasi dari
   * berbagai serangan web seperti XSS, clickjacking, dan MITM.
   */
  async headers() {
    const origin = typeof window !== "undefined" ? window.location.origin : null;

    return [
      {
        source: "/:path*",
        headers: [
          // DNS Prefetch Control
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          // Strict-Transport-Security (HSTS)
          // Hanya aktif di production dengan HTTPS
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
          // X-Frame-Options
          // Mencegah clickjacking dengan memblokir iframe
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          // X-Content-Type-Options
          // Mencegah MIME sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // X-XSS-Protection
          // XSS filter di browser (legacy, tapi masih berguna)
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // Referrer-Policy
          // Mengontrol informasi referrer yang dikirim
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Permissions-Policy
          // Membatasi fitur browser yang bisa digunakan
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Content-Security-Policy (CSP)
          // Membatasi sumber resource yang bisa di-load
          {
            key: "Content-Security-Policy",
            value: [
              // Default source: hanya dari origin yang sama
              "default-src 'self';",
              // Script sources: self dan unsafe-eval untuk Next.js development
              "script-src 'self' 'unsafe-eval' 'unsafe-inline';",
              // Style sources: self dan unsafe-inline untuk Tailwind/Next.js
              "style-src 'self' 'unsafe-inline';",
              // Image sources: self, data URLs, blob URLs, dan any https
              "img-src 'self' data: blob: https: http:",
              // Font sources: self dan data URLs
              "font-src 'self' data:;",
              // Connect sources: self dan same origin
              "connect-src 'self' https: http:",
              // Worker sources
              "worker-src 'self' blob:",
              // Frame ancestors: mencegah iframe embedding
              "frame-ancestors 'self';",
              // Base URI: restrict base tag
              "base-uri 'self';",
              // Form action: restrict form submissions
              "form-action 'self';",
            ].join(" "),
          },
          // CORS headers untuk API routes
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-Requested-With",
          },
          {
            key: "Access-Control-Max-Age",
            value: "86400", // 24 hours
          },
        ],
      },
      // Specific headers untuk API routes
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: ALLOWED_ORIGINS[0], // Use first allowed origin for simplicity
          },
        ],
      },
    ];
  },
};

export default nextConfig;

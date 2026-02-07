import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",

  // Trailing slash handling for compatibility
  trailingSlash: false,

  // Disable powered by header
  poweredByHeader: false,

  /**
   * Security Headers
   * Headers ini dikonfigurasi untuk work well dengan reverse proxy
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // X-Content-Type-Options - prevent MIME sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // X-Frame-Options - prevent clickjacking
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // Referrer-Policy - control referrer information
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Permissions-Policy - restrict browser features
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Content-Security-Policy (CSP) - more permissive for reverse proxy
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self';",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline';",
              "style-src 'self' 'unsafe-inline';",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' data:;",
              "connect-src 'self' https: http: ws: wss:",
              "media-src 'self' blob:",
              "worker-src 'self' blob:",
              "frame-ancestors 'none';",
              "base-uri 'self';",
              "form-action 'self';",
            ].join(" "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

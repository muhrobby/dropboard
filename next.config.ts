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
          // Note: CSP and HSTS should be configured at reverse proxy level (Traefik/Nginx)
        ],
      },
    ];
  },
};

export default nextConfig;

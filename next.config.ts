import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",

  // Trailing slash handling for compatibility
  trailingSlash: false,

  // Disable powered by header
  poweredByHeader: false,
};

export default nextConfig;

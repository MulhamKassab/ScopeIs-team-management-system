import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  allowedDevOrigins: ["127.0.0.1"],
  // Keep the development badge from covering the first mobile navigation item.
  devIndicators: false,
};

export default nextConfig;

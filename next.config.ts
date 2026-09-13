import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output keeps the Docker image small; Vercel ignores it.
  output: "standalone",
};

export default nextConfig;

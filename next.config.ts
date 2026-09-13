import type { NextConfig } from "next";

// NEXT_OUTPUT=export builds a fully static site (GitHub Pages); the default standalone output is for Docker.
// NEXT_BASE_PATH="/piano-app" when hosted under a repository path rather than a domain root.
const output = process.env.NEXT_OUTPUT === "export" ? "export" : "standalone";
const basePath = process.env.NEXT_BASE_PATH?.replace(/\/$/, "") || undefined;

const nextConfig: NextConfig = {
  output,
  basePath,
  assetPrefix: basePath,
  trailingSlash: output === "export",
  env: { NEXT_PUBLIC_BASE_PATH: basePath ?? "" },
};

export default nextConfig;

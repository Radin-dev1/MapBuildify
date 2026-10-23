import type { NextConfig } from "next";

// Static export for GitHub Pages. The Pages workflow sets NEXT_PUBLIC_BASE_PATH
// to "/MapBuildify"; locally it is empty.
const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;

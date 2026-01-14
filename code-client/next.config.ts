import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  // This creates a minimal production bundle
  output: "standalone",
  
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;


import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    authInterrupts: true,
  },
  transpilePackages: ["@pfadipuck/puck-web", "@pfadipuck/graphics"],
};

export default nextConfig;

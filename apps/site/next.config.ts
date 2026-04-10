import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@pfadipuck/puck-web", "@pfadipuck/graphics"],
};

export default nextConfig;

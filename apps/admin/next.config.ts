import type { NextConfig } from "next";

const s3Endpoint = process.env.S3_ENDPOINT;
const s3Remote = s3Endpoint ? new URL(s3Endpoint) : null;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    authInterrupts: true,
  },
  transpilePackages: ["@pfadipuck/puck-web", "@pfadipuck/graphics"],
  images: {
    remotePatterns: s3Remote
      ? [
          {
            protocol: s3Remote.protocol.replace(":", "") as "http" | "https",
            hostname: s3Remote.hostname,
            port: s3Remote.port || undefined,
            pathname: "/**",
          },
        ]
      : [],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const configuredOrigins = process.env.ALLOWED_ORIGINS
  ?.split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: configuredOrigins?.length ? configuredOrigins : ["localhost:3000"],
    },
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server-only SDKs that should not be bundled into route handlers.
  serverExternalPackages: ["firebase-admin", "googleapis", "nodemailer"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

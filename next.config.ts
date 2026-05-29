import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Don't run the SW in `next dev` — HMR + a real SW is a debugging
  // nightmare. Production builds (`next start`) still register it.
  disable: process.env.NODE_ENV === "development",
  cacheOnNavigation: true,
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default withSerwist(nextConfig);

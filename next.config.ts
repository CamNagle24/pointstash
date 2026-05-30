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
  // Allow a separate build output dir (e.g. NEXT_DIST_DIR=.next-prod) so a
  // production build can run alongside `next dev` without clobbering its
  // .next. Defaults to the standard .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default withSerwist(nextConfig);

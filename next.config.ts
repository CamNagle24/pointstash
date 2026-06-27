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
    // Only Google OAuth profile photos (`user.image`) are a legitimate
    // remote image source today. A wildcard hostname here turns Next's
    // built-in `/_next/image` optimizer into an open SSRF-capable proxy
    // that will fetch any attacker-supplied https URL server-side.
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);

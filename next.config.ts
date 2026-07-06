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
    // 'unsafe-inline' on script-src is required by Next.js App Router (inline
    // hydration scripts). 'unsafe-eval' covers RSC streaming in development.
    // blob: on img-src supports ScreenshotUploader's local preview URL.
    // lh3.googleusercontent.com is the only external image host (Google OAuth
    // profile photos via next/image's remotePatterns).
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https://lh3.googleusercontent.com",
      "font-src 'self'",
      "connect-src 'self'",
      "media-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "worker-src 'self'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
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

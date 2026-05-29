/// <reference lib="webworker" />
// Service worker source. Built by @serwist/next into /public/sw.js at
// `next build` time (see next.config.ts). The serwist runtime handles
// precaching the build manifest + applying our runtime caching strategies
// below.
//
// Strategy summary:
//   - Page navigations:   NetworkFirst with offline fallback to /offline
//   - API responses:      NetworkFirst, cache so the dashboard can still
//                         show last-known balances when offline
//   - Static assets:      StaleWhileRevalidate (Serwist default precache
//                         covers Next's build assets; runtime catches
//                         /chains/*.svg, fonts, etc.)
//   - Cross-origin imgs:  StaleWhileRevalidate so chain logos persist

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Same-origin API responses — show stale data when offline so the
    // dashboard isn't a blank page.
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/api/"),
      handler: new NetworkFirst({
        cacheName: "pointstash-api",
        networkTimeoutSeconds: 5,
        plugins: [],
      }),
    },
    // Static chain logos and other /public images.
    {
      matcher: ({ url, sameOrigin, request }) =>
        sameOrigin && request.destination === "image",
      handler: new StaleWhileRevalidate({
        cacheName: "pointstash-images",
      }),
    },
    // Everything else falls through to Serwist's sensible defaults
    // (Next.js build assets, fonts, etc.).
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();

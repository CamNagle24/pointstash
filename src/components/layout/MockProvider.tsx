"use client";

import * as React from "react";

const ENABLED =
  typeof process !== "undefined" && process.env?.NEXT_PUBLIC_ENABLE_MSW === "1";

/**
 * Conditionally boots Mock Service Worker in the browser so the frontend can
 * run against the seeded fixtures without a real database.
 *
 * Activate by setting `NEXT_PUBLIC_ENABLE_MSW=1` in `.env.local`. The
 * import is dynamic so msw is fully tree-shaken out of the production bundle
 * when the flag is unset.
 */
export function MockProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(!ENABLED);

  React.useEffect(() => {
    if (!ENABLED) return;
    let cancelled = false;
    (async () => {
      try {
        const { worker } = await import("../../../tests/mocks/browser");
        await worker.start({
          onUnhandledRequest: "bypass",
          serviceWorker: { url: "/mockServiceWorker.js" },
        });
        if (!cancelled) setReady(true);
        console.info("[msw] mock api active — set NEXT_PUBLIC_ENABLE_MSW=0 to disable");
      } catch (err) {
        console.warn("[msw] failed to start; continuing with real API", err);
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}

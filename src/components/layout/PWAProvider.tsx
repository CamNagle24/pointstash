"use client";

import { SerwistProvider } from "@serwist/next/react";
import type { ReactNode } from "react";

// Registers /sw.js in production via @serwist/window. The SW itself is
// disabled in dev (see next.config.ts) so this is a no-op locally.
export function PWAProvider({ children }: { children: ReactNode }) {
  return (
    <SerwistProvider
      swUrl="/sw.js"
      disable={process.env.NODE_ENV === "development"}
      reloadOnOnline
    >
      {children}
    </SerwistProvider>
  );
}

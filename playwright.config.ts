import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // 1 retry locally too — Next.js dev-server hot-reload can flake interactions
  // when many tests hammer the page concurrently. CI gets 2 retries.
  retries: process.env.CI ? 2 : 1,
  // Cap workers — `npm run dev` is single-threaded and gets overwhelmed by 8
  // concurrent browser sessions, surfacing as missed clicks and timeouts.
  workers: process.env.CI ? 4 : 2,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    // Framer-Motion honors prefers-reduced-motion — telling every context to
    // request reduced motion turns whileHover transforms, layoutId pills,
    // staggered card entrances, etc. into instant transitions, removing the
    // dominant source of cross-browser flake.
    reducedMotion: "reduce",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});

import type { Page } from "@playwright/test";

// Must run via page.evaluate (not page.request, which bypasses the Service
// Worker) and only after the page has navigated to the app at least once,
// so MSW's worker is registered and intercepting fetches. Reloads afterward
// so the app's own data fetches (already in flight before this resolves)
// re-run against the now-reset store instead of leaving stale state on screen.
export async function resetMockStore(page: Page) {
  await page.evaluate(() => fetch("/api/test/reset-mock-store", { method: "POST" }));
  await page.reload();
}

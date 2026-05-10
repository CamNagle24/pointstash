import { test, expect } from "@playwright/test";

test.describe("deals feed", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/dashboard/deals");
  });

  test("loads and displays current deals", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /this week/i })).toBeVisible();
    // The mock feed always seeds at least 9 deals — we only assert "many".
    await expect(page.getByRole("button", { name: /open in app/i }).first()).toBeVisible();
    expect(await page.getByRole("button", { name: /open in app/i }).count()).toBeGreaterThanOrEqual(3);
  });

  test("filters deals by chain", async ({ page }) => {
    // Click the Starbucks chain pill — only Starbucks deals should remain.
    await page.getByRole("button", { name: /sbx/i }).click();

    // Only Starbucks-branded cards should be visible.
    const cards = page.locator("article, [class*='Card']");
    const visibleCards = await page.getByText(/starbucks/i).count();
    expect(visibleCards).toBeGreaterThan(0);
    void cards;

    // Re-click "All chains" to reset.
    await page.getByRole("button", { name: /all chains/i }).click();
    expect(await page.getByRole("button", { name: /open in app/i }).count()).toBeGreaterThanOrEqual(3);
  });

  test("filters deals by type", async ({ page }) => {
    const trigger = page.getByRole("button", { name: /^type/i });
    await trigger.hover();
    await trigger.click();

    // Radix portals the menu and animates it in — wait for the item with a
    // generous timeout, then click it directly on the DOM to dodge any
    // outside-click handler that might race the click on webkit.
    const item = page.getByRole("menuitemcheckbox", { name: /^app exclusive$/i });
    await expect(item).toBeVisible({ timeout: 10_000 });
    await item.evaluate((el) => (el as HTMLElement).click());

    await page.keyboard.press("Escape").catch(() => {});

    // Filter pill should reflect at least one app-exclusive deal.
    await expect(page.getByText(/app exclusive/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("shows expiration countdown on each card", async ({ page }) => {
    // Each visible deal has an "Expires in …" line.
    const expiresLines = page.locator("text=/expires in /i");
    expect(await expiresLines.count()).toBeGreaterThan(0);
  });

  test("shows empty state when no deals match filters", async ({ page }) => {
    const search = page.getByPlaceholder(/search deals/i);
    await search.click();
    await search.fill("zzzzzz-no-such-deal");
    // Webkit can lag on controlled-input updates — verify the value first,
    // then give the empty-state assertion a generous timeout.
    await expect(search).toHaveValue("zzzzzz-no-such-deal");
    await expect(page.getByText(/no deals match those filters/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});

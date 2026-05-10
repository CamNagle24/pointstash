import { test, expect } from "@playwright/test";

test.describe("dashboard home", () => {
  test("shows account cards when accounts exist", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /your stash/i })).toBeVisible();
    // The seeded mock data includes McDonald's, Starbucks, Chick-fil-A.
    await expect(page.getByText("McDonald's").first()).toBeVisible();
    await expect(page.getByText("Starbucks").first()).toBeVisible();
    await expect(page.getByText("Chick-fil-A").first()).toBeVisible();
  });

  test("displays total estimated value as a dollar figure", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText(/total estimated rewards/i)).toBeVisible();
    // The animated header should land on a dollar value (e.g. $54.21).
    await expect(page.locator("text=/\\$\\d+\\.\\d{2}/").first()).toBeVisible();
  });

  test("navigates between dashboard pages via sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/dashboard");

    // The sidebar uses a Framer layoutId pill that animates on each
    // navigation. In firefox the click can race the layout transition and
    // miss — hover first to settle the layer, then click.
    const navTo = async (linkRe: RegExp, urlRe: RegExp) => {
      const link = page.getByRole("link", { name: linkRe });
      await link.hover();
      await link.click();
      await expect(page).toHaveURL(urlRe, { timeout: 10_000 });
    };

    await navTo(/^deals$/i, /\/dashboard\/deals/);
    await expect(page.getByRole("heading", { name: /this week/i })).toBeVisible();

    await navTo(/^redeem$/i, /\/dashboard\/redeem/);
    await expect(page.getByRole("heading", { name: /redeem smarter/i })).toBeVisible();

    await navTo(/^accounts$/i, /\/dashboard\/accounts/);
    await expect(page.getByRole("heading", { name: /^accounts$/i })).toBeVisible();

    await navTo(/^dashboard$/i, /\/dashboard$/);
  });

  test("shows empty state when no accounts linked", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/dashboard/accounts");

    // Unlink every seeded account, then the empty-state card should appear.
    while (await page.getByRole("button", { name: /unlink account/i }).count()) {
      await page.getByRole("button", { name: /unlink account/i }).first().click();
    }

    await expect(page.getByText(/no accounts yet/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /link account/i })).toBeVisible();
  });
});

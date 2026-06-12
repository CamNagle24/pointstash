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

// The affordability arc: linked accounts (seeded) give every points-cost deal a
// balance to compare against, which surfaces the dashboard "Affordable now" stat
// and the deals-feed "Affordable" toggle. Linking itself is exercised by
// add-account.spec; here the seeded accounts are the precondition.
test.describe("affordability flow", () => {
  test("the Affordable-now stat deep-links into a redeemable-only feed", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/dashboard");

    // The stat is a link, and only renders once accounts are linked.
    const affordableStat = page.getByRole("link", { name: /affordable now/i });
    await expect(affordableStat).toBeVisible();
    await affordableStat.click();

    // Lands on the deals feed carrying the affordable deep-link param. The page
    // also mirrors the seeded chain filter into the URL, so match loosely.
    await expect(page).toHaveURL(/\/dashboard\/deals\?.*\baffordable=1\b/);

    // The toggle renders (it needs a balance to compare against) and the deep
    // link pre-enabled it, so the feed is scoped to redeemable deals: the filter
    // drops every points deal the user can't yet afford. Either some affordable
    // cards show, or the affordability empty state — but never a "N short" line,
    // which only appears on a deal the user can't afford.
    await expect(page.getByRole("button", { name: /^affordable$/i })).toBeVisible();
    await expect(page.getByText(/\d[\d,]* short\b/)).toHaveCount(0);
  });

  test("toggling Affordable narrows the feed to a redeemable subset", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/dashboard/deals");

    // Wait for the feed to settle — each card carries exactly one CTA button.
    const cta = page.getByRole("button", { name: /open in app|redeem|view deal/i });
    await expect(cta.first()).toBeVisible();
    const before = await cta.count();

    const toggle = page.getByRole("button", { name: /^affordable$/i });
    await expect(toggle).toBeVisible();
    await toggle.click();

    // The filter records itself in the URL and can only shrink the feed
    // (affordable deals are a strict subset), leaving no unaffordable card.
    await expect(page).toHaveURL(/\baffordable=1\b/);
    expect(await cta.count()).toBeLessThanOrEqual(before);
    await expect(page.getByText(/\d[\d,]* short\b/)).toHaveCount(0);
  });
});

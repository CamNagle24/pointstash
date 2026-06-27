import { test, expect } from "@playwright/test";

// Seeded chickfila account (tests/mocks/fixtures/accounts.json) starts at 320
// points. Of its redemptions, Chocolate Chunk Cookie (200 pts) is both the
// cheapest and the highest cents-per-point, so it sorts first and is
// affordable — a deterministic target for the full redeem flow.
test.describe("redeem flow", () => {
  test("marking a redemption deducts points and updates the balance", async ({ page }) => {
    await page.goto("/dashboard/redeem?chain=chickfila");

    await expect(
      page.getByRole("heading", { name: /all chick-fil-a redemptions/i }),
    ).toBeVisible();

    const balanceCard = page.getByText("Your balance").locator("..");
    await expect(balanceCard).toContainText("320");

    const markRedeemedButtons = page.getByRole("button", { name: "Mark redeemed" });
    const bestButton = markRedeemedButtons.first();
    await expect(bestButton).toBeEnabled();
    await bestButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Mark as redeemed?");
    await expect(dialog).toContainText("Chocolate Chunk Cookie");
    await expect(dialog).toContainText("120"); // 320 - 200 resulting balance

    await page.getByRole("button", { name: "Confirm redemption" }).click();

    await expect(page.getByText("Marked as redeemed")).toBeVisible();
    await expect(page.getByText("Mark as redeemed?")).toHaveCount(0);

    await expect(balanceCard).toContainText("120");
    // The just-redeemed item cost 200 pts — no longer affordable at 120.
    await expect(bestButton).toBeDisabled();
  });
});

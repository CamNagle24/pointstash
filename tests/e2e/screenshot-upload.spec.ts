import path from "node:path";
import { test, expect } from "@playwright/test";

// MSW's POST /api/upload mock (tests/mocks/handlers.ts) always returns
// extractedPoints: 6240 / confidence: "high" regardless of the uploaded
// file's actual bytes, so any valid PNG fixture drives a deterministic flow.
const FIXTURE_PATH = path.join(__dirname, "..", "fixtures", "screenshot.png");

// The account-linking UI (AddAccountModal + ChainAccountCard) lives directly
// on /dashboard, not a standalone /dashboard/accounts route — there's no such
// route in the app today, despite some other e2e specs assuming one exists.
test.describe("screenshot upload flow", () => {
  test("uploading a screenshot OCRs the balance and links the account", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /your stash/i })).toBeVisible();

    await page.getByRole("button", { name: /link a new account/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(
      page.getByRole("heading", { name: /link a rewards account/i }),
    ).toBeVisible({ timeout: 5_000 });

    const wendysBtn = page.getByRole("button", { name: /^wendy's$/i });
    await expect(wendysBtn).toBeVisible({ timeout: 10_000 });
    await wendysBtn.click();
    await page.getByRole("button", { name: /^continue$/i }).click();

    await page.getByRole("button", { name: /^screenshot\b/i }).click();

    await dialog.locator('input[type="file"]').setInputFiles(FIXTURE_PATH);

    await expect(dialog.getByText(/high confidence/i)).toBeVisible({ timeout: 10_000 });
    const editedPoints = dialog.locator('input[inputmode="numeric"]');
    await expect(editedPoints).toHaveValue("6240");

    await dialog.getByRole("button", { name: /use 6,240 points/i }).click();

    await expect(dialog.getByText(/all stacked/i)).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByText(/wendy's now contributes/i)).toContainText("6,240");
    await page.getByRole("button", { name: /^done$/i }).click();

    await expect(page.getByText("Wendy's").first()).toBeVisible();
    await expect(page.locator("text=/6,240\\s*pts/").first()).toBeVisible();
  });
});

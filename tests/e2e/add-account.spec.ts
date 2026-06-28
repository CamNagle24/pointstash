import { test, expect, type Page } from "@playwright/test";

// The account-linking/unlinking UI (AddAccountModal + ChainAccountCard +
// AccountDetailsDialog) lives directly on /dashboard — there's no standalone
// /dashboard/accounts route in the app.
async function openAddAccountModal(page: Page) {
  const trigger = page.getByRole("button", { name: /link a new account/i });
  await expect(trigger).toBeVisible();
  const dialog = page.getByRole("dialog");

  // Webkit/firefox occasionally drop the first click while the page is
  // still settling. Retry up to 3 times until the dialog actually mounts.
  for (let attempt = 0; attempt < 3; attempt++) {
    await trigger.click({ timeout: 5_000 }).catch(() => {});
    try {
      await expect(dialog).toBeVisible({ timeout: 4_000 });
      break;
    } catch {
      if (attempt === 2) throw new Error("Add-account modal failed to open");
      await page.waitForTimeout(200);
    }
  }
  await expect(
    page.getByRole("heading", { name: /link a rewards account/i }),
  ).toBeVisible({ timeout: 5_000 });
}

// Run serially in one browser context — these tests all hammer the same
// /dashboard page, and parallel browser sessions overwhelm the dev server's
// hot-reload + cause cross-test interaction races.
test.describe.configure({ mode: "serial" });

test.describe("add-account flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /your stash/i })).toBeVisible();
  });

  test("can add a new Popeyes account with manual points", async ({ page }) => {
    await openAddAccountModal(page);

    const popeyesBtn = page.getByRole("button", { name: /^popeyes$/i });
    await expect(popeyesBtn).toBeVisible({ timeout: 10_000 });
    await popeyesBtn.click();

    await page.getByRole("button", { name: /^continue$/i }).click();

    const balanceInput = page.getByLabel(/current points balance/i);
    await expect(balanceInput).toBeVisible();
    await balanceInput.fill("1240");
    await page.getByRole("button", { name: /save account/i }).click();

    await expect(page.getByText(/all stacked/i)).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /^done$/i }).click();

    // The new chain shows up in the linked-accounts grid.
    await expect(page.getByText("Popeyes").first()).toBeVisible();
    await expect(page.locator("text=/1,240\\s*pts/").first()).toBeVisible();
  });

  test("prevents adding a duplicate chain account in the UI", async ({ page }) => {
    // Re-add an already-linked chain. The API 409s and the modal surfaces an
    // "Already linked" toast instead of advancing to the success step, so no
    // duplicate McDonald's card should ever materialize.
    await openAddAccountModal(page);

    const mcdBtn = page.getByRole("button", { name: /^mcdonald's$/i });
    await expect(mcdBtn).toBeVisible({ timeout: 10_000 });
    await mcdBtn.click();
    await page.getByRole("button", { name: /^continue$/i }).click();

    const balanceInput = page.getByLabel(/current points balance/i);
    await expect(balanceInput).toBeVisible();
    await balanceInput.fill("100");
    await page.getByRole("button", { name: /save account/i }).click();

    await expect(page.getByText(/already linked/i)).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press("Escape").catch(() => {});

    // Scope the duplicate check to card chain-name labels (`font-display`) so
    // the modal's chain-preview text (which renders with `font-medium`, no
    // `font-display`) can't pollute the count if the modal lingers.
    const mcdNameCells = page.locator("p.font-display", { hasText: /^McDonald's$/ });
    await expect(mcdNameCells).toHaveCount(1, { timeout: 10_000 });
  });

  test("can update points inline on an account card", async ({ page }) => {
    // Wait for the staggered card-entry animation to land before interacting.
    await expect(
      page.getByRole("button", { name: /edit points/i }).first(),
    ).toBeVisible();

    // The card has a Framer `whileHover` transform — hover-then-click
    // explicitly so firefox sees a stable layer when the click lands.
    const editBtn = page.getByRole("button", { name: /edit points/i }).first();
    await editBtn.hover();
    await editBtn.click();

    // Scope the input to the same card we just clicked, in case React re-keys
    // siblings and our selector grabs a different inputmode-numeric node.
    const editingCard = page
      .locator("div", { has: page.locator('input[inputmode="numeric"]') })
      .first();
    const input = editingCard.locator('input[inputmode="numeric"]');
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.fill("9999");
    await input.press("Enter");

    // The toast appears once and only once — strict mode would catch a
    // double-fire from the Enter→blur path that's guarded with skipBlurRef.
    await expect(page.getByText(/points updated/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("text=/9,999/").first()).toBeVisible();
  });

  test("removes an account when disconnect is confirmed", async ({ page }) => {
    const settingsButtons = page.getByRole("button", { name: /account settings/i });
    // Wait for all 3 seeded rows to actually be mounted in the DOM before we
    // sample anything. toHaveCount polls — without it we can race the stagger.
    await expect(settingsButtons).toHaveCount(3);

    // Chick-fil-A is the 3rd seeded account (tests/mocks/fixtures/accounts.json),
    // and cards render in that same array order — pick it by index rather
    // than trying to scope a button to its card's chain-name text.
    await settingsButtons.nth(2).click();
    await expect(page.getByRole("button", { name: /^disconnect$/i })).toBeVisible({
      timeout: 5_000,
    });

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: /^disconnect$/i }).click();

    await expect(page.getByText(/unlinked/i)).toBeVisible({ timeout: 10_000 });
    await expect(settingsButtons).toHaveCount(2);
    await expect(page.getByText("Chick-fil-A")).toHaveCount(0);
  });

  // Confirmation dialog before deleting hasn't been wired up yet — once added,
  // un-fixme this test.
  test.fixme("shows confirmation when deleting an account", async ({ page }) => {
    await page.getByRole("button", { name: /account settings/i }).first().click();
    await page.getByRole("button", { name: /^disconnect$/i }).click();
    await expect(page.getByText(/are you sure/i)).toBeVisible();
    await page.getByRole("button", { name: /confirm/i }).click();
  });
});

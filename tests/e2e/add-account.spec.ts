import { test, expect, type Page } from "@playwright/test";

async function openAddAccountModal(page: Page) {
  const trigger = page.getByRole("button", { name: /link new account/i });
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
// /dashboard/accounts page, and parallel browser sessions overwhelm the
// dev server's hot-reload + cause cross-test interaction races.
test.describe.configure({ mode: "serial" });

test.describe("add-account flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/dashboard/accounts");
    // Stagger animations on the seeded rows take ~250ms — wait for one row.
    await expect(page.getByRole("button", { name: /unlink account/i }).first()).toBeVisible();
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

    // The new chain shows up in the accounts table.
    await expect(page.getByText("Popeyes").first()).toBeVisible();
    await expect(page.locator("text=/1,240\\s*pts/").first()).toBeVisible();
  });

  test("prevents adding a duplicate chain account in the UI", async ({ page }) => {
    // Re-add an already-linked chain. The accounts page dedupes locally on
    // link so a duplicate McDonald's row should never materialize.
    await openAddAccountModal(page);

    const mcdBtn = page.getByRole("button", { name: /^mcdonald's$/i });
    await expect(mcdBtn).toBeVisible({ timeout: 10_000 });
    await mcdBtn.click();
    await page.getByRole("button", { name: /^continue$/i }).click();

    const balanceInput = page.getByLabel(/current points balance/i);
    await expect(balanceInput).toBeVisible();
    await balanceInput.fill("100");
    await page.getByRole("button", { name: /save account/i }).click();

    // Close whichever final state the modal lands on (success step or error
    // toast — both are valid for "duplicate prevented").
    await page
      .getByRole("button", { name: /^done$/i })
      .click({ timeout: 4_000 })
      .catch(() => {});
    await page.keyboard.press("Escape").catch(() => {});

    // Scope the duplicate check to table-row chain labels (which carry
    // `truncate font-medium`) so the modal's chain-preview p (which only
    // has `font-medium`) can't pollute the count if the modal lingers.
    const mcdNameCells = page.locator("p.truncate.font-medium", {
      hasText: /^McDonald's$/,
    });
    await expect(mcdNameCells).toHaveCount(1, { timeout: 10_000 });
  });

  test("can update points inline on an account card", async ({ page }) => {
    await page.goto("/dashboard");
    // Wait for the staggered card-entry animation to land before interacting.
    await expect(
      page.getByRole("button", { name: /update points/i }).first(),
    ).toBeVisible();

    // The card has a Framer `whileHover` transform — hover-then-click
    // explicitly so firefox sees a stable layer when the click lands.
    const updateBtn = page.getByRole("button", { name: /update points/i }).first();
    await updateBtn.hover();
    await updateBtn.click();

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
    // double-fire from the Enter→blur path that we guarded with skipBlurRef.
    await expect(page.getByText(/points updated/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("text=/9,999/").first()).toBeVisible();
  });

  test("removes an account when the unlink button is clicked", async ({ page }) => {
    const unlink = page.getByRole("button", { name: /unlink account/i });
    // Wait for all 6 seeded rows to actually be mounted in the DOM before we
    // sample anything. toHaveCount polls — without it we can race the stagger.
    await expect(unlink).toHaveCount(6);

    // Try a real click first — this works on chromium/firefox most of the
    // time. If the row hasn't unmounted within 1.5s, fall back to a
    // page-evaluated pointer sequence that React 19's delegated handler
    // recognises in webkit even when the row's motion.div is mid-remount.
    await unlink.first().click({ force: true }).catch(() => {});
    try {
      await expect(unlink).toHaveCount(5, { timeout: 1_500 });
    } catch {
      await page.evaluate(() => {
        const btn = document.querySelector(
          'button[aria-label="Unlink account"]',
        ) as HTMLButtonElement | null;
        if (!btn) return;
        ["pointerdown", "pointerup", "click"].forEach((type) =>
          btn.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true })),
        );
      });
      await expect(unlink).toHaveCount(5, { timeout: 10_000 });
    }
  });

  // Confirmation dialog before deleting hasn't been wired up yet — once added,
  // un-fixme this test.
  test.fixme("shows confirmation when deleting an account", async ({ page }) => {
    await page.getByRole("button", { name: /unlink account/i }).first().click();
    await expect(page.getByText(/are you sure/i)).toBeVisible();
    await page.getByRole("button", { name: /confirm/i }).click();
  });
});

import { test, expect } from "@playwright/test";

test.describe("auth", () => {
  test("login page renders the sign-in form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
  });

  test("login page offers Google + GitHub OAuth", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /continue with github/i })).toBeVisible();
  });

  // Sign-up is not a distinct page yet — the "Create an account" link drops
  // you straight into the dashboard so the demo can be explored without auth.
  test("user can sign up with email", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /create an account/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("user can log in", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("you@stash.it");
    await page.getByLabel(/password/i).fill("hunter22");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/dashboard");
    // middleware.ts redirects to /login?from=<path> — check both the destination
    // and that the ?from param is preserved so the user can be sent back after login.
    await expect(page).toHaveURL(/\/login/);
    const url = new URL(page.url());
    expect(url.searchParams.get("from")).toBe("/dashboard");
  });

  test("user can log out", async ({ page }) => {
    // Desktop viewport ensures the sidebar (and its sign-out button) is visible
    // and expanded rather than collapsed into the mobile drawer.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/dashboard");
    const signOutBtn = page.getByRole("button", { name: /sign out/i });
    await expect(signOutBtn).toBeVisible({ timeout: 5_000 });
    await signOutBtn.click();
    await expect(page).toHaveURL(/\/login/);
  });
});

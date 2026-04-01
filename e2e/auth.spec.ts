import { test, expect } from "@playwright/test";

test.describe("Authentication — unauthenticated access", () => {
  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("unauthenticated user cannot access project pages", async ({ page }) => {
    await page.goto("/p/dddddddd-dddd-dddd-dddd-dddddddddddd/table");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

import { Page } from "@playwright/test";
import { TEST_USERS } from "../../__tests__/fixtures";

/**
 * Reusable login helper for Playwright E2E tests.
 * Signs in via the login page and waits for redirect.
 */
export async function login(
  page: Page,
  user = TEST_USERS.owner
) {
  await page.goto("/auth/login");
  await page.fill('[name="email"]', user.email);
  await page.fill('[name="password"]', user.password);
  await page.click('[type="submit"]');
  // Wait for navigation away from login page
  await page.waitForURL((url) => !url.pathname.includes("/auth/login"), {
    timeout: 10000,
  });
}

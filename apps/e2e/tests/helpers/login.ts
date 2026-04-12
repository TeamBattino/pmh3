import type { Page } from "@playwright/test";

const ADMIN_URL = process.env.E2E_ADMIN_URL ?? "http://admin:3001";

/**
 * Drives the full OIDC login flow through the auth service and mock MiData.
 *
 * Flow: admin → auth service /authorize → mock-oidc (MiData sim) login page
 *       → auth service /callback → admin callback → session established.
 *
 * The mock-oidc login page shows MiData-shaped test users with group
 * memberships. The `user` param selects which button to click.
 */
export type TestUser = "Dev Admin" | "Dev Leiter" | "Dev JungLeiter" | "Dev Member";

export async function loginAs(
  page: Page,
  user: TestUser
): Promise<void> {
  await page.goto("/");
  await page.waitForURL(/\/login/);
  // Click the OIDC sign-in button on the admin's custom /login page
  await page.getByRole("button", { name: /login with midata/i }).click();
  // Now on mock-oidc's login page — click the test user button.
  // The button text starts with the user name.
  await page.getByRole("button", { name: new RegExp(`^${user}`) }).click();
  // Wait to land back on the admin dashboard
  await page.waitForURL(`${ADMIN_URL}/`);
}

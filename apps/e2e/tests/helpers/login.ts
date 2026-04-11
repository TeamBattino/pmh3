import type { Page } from "@playwright/test";

const ADMIN_URL = process.env.E2E_ADMIN_URL ?? "http://admin:3001";

/**
 * Drives the full OIDC login flow on behalf of a test, from the admin's
 * landing page through next-auth's sign-in UI and the mock OIDC's custom
 * role-picker login page. Leaves the browser sitting on the admin home.
 *
 * URLs come from `E2E_ADMIN_URL` so the same test can run inside docker
 * compose (service-name networking) or against a local stack.
 *
 * mock-oauth2-server 2.1.10 serves the interactive login form directly
 * at `/default/authorize` rather than redirecting to `/login`, so we
 * can't gate on the URL path — we rely on playwright's auto-waiting
 * for the role button instead.
 */
export async function loginAs(
  page: Page,
  role: "Admin" | "Leiter" | "JungLeiter"
): Promise<void> {
  await page.goto("/");
  await page.waitForURL(/\/auth\/signin/);
  await page.getByRole("button", { name: /oidc/i }).click();
  await page.getByRole("button", { name: new RegExp(`^${role}`) }).click();
  await page.waitForURL(`${ADMIN_URL}/`);
}

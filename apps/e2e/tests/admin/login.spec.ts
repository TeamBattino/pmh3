import { expect, test } from "@playwright/test";
import { loginAs } from "../helpers/login";

/**
 * Smoke-tests the full OIDC login flow against the mock OIDC server.
 *
 * The flow is:
 *   1. Anonymous user visits `/` → admin calls `unauthorized()` →
 *      `unauthorized.tsx` redirects to `/auth/signin?callbackUrl=/`.
 *   2. Next-auth's default sign-in page renders a single "OIDC" button.
 *   3. Clicking it redirects to the mock OIDC, which serves the custom
 *      login page with three role buttons.
 *   4. Clicking a role button POSTs `username` + `claims`, the mock OIDC
 *      issues a code, and the browser is redirected to the admin's
 *      callback URL → session cookie set → landing on `/`.
 */

for (const role of ["Admin", "Leiter", "JungLeiter"] as const) {
  test(`logs in as ${role}`, async ({ page }) => {
    await loginAs(page, role);
    await expect(page.getByText(/welcome/i)).toBeVisible();

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) =>
      c.name.includes("authjs.session-token")
    );
    expect(sessionCookie).toBeDefined();
  });
}

test("JungLeiter is forbidden from /security", async ({ page }) => {
  await loginAs(page, "JungLeiter");
  // Security page requires `role-permissions:read`, which JungLeiter
  // doesn't have → `requireServerPermission()` calls `forbidden()`.
  const response = await page.goto("/security");
  expect(response?.status()).toBeGreaterThanOrEqual(400);
});

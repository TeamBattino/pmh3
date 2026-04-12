import { expect, test } from "@playwright/test";
import { loginAs } from "../helpers/login";

/**
 * Smoke-tests the full SSO login flow through the auth service and mock MiData.
 *
 * Flow: admin → auth service → mock-oidc (MiData sim) → auth service
 *       → admin callback → session cookie.
 */

for (const user of ["Dev Admin", "Dev Leiter", "Dev JungLeiter"] as const) {
  test(`logs in as ${user}`, async ({ page }) => {
    await loginAs(page, user);

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) =>
      c.name.includes("authjs.session-token")
    );
    expect(sessionCookie).toBeDefined();
  });
}

test("JungLeiter is forbidden from /security/roles", async ({ page }) => {
  await loginAs(page, "Dev JungLeiter");
  const response = await page.goto("/security/roles");
  expect(response?.status()).toBeGreaterThanOrEqual(400);
});

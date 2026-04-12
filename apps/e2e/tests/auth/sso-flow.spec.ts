import { expect, test } from "@playwright/test";
import { loginAs } from "../helpers/login";

/**
 * Tests the SSO auth flow end-to-end:
 * - MiData group memberships are mapped to internal roles via the auth service
 * - Roles determine what the user can access in the admin app
 * - Users without matching group mappings are denied access
 */

test.describe("SSO role mapping", () => {
  test("Admin user sees full sidebar", async ({ page }) => {
    await loginAs(page, "Dev Admin");

    // Admin with global-admin should see security links
    await expect(page.getByRole("link", { name: "Roles" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Pages" })).toBeVisible();
  });

  test("Leiter user has limited access", async ({ page }) => {
    await loginAs(page, "Dev Leiter");

    // Leiter should see content pages
    await expect(page.getByRole("link", { name: "Pages" })).toBeVisible();
  });

  test("Member user with no matching groups is denied", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/auth\/signin/);
    await page.getByRole("button", { name: /oidc/i }).click();
    // Click the "Dev Member" button — this user's group 7777 doesn't match any role
    await page
      .getByRole("button", { name: /Dev Member/ })
      .click();

    // Should end up on an error page — auth service returns access_denied
    // which NextAuth surfaces as an OAuthCallbackError
    await expect(page).toHaveURL(/\/auth\/signin\?error/);
  });
});

test.describe("SSO security pages", () => {
  test("Admin can view roles page", async ({ page }) => {
    await loginAs(page, "Dev Admin");
    await page.goto("/security/roles");
    // Should see the roles table with role names (wait for data to load)
    await expect(
      page.getByRole("cell", { name: "Admin", exact: true })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Admin can view permissions page", async ({ page }) => {
    await loginAs(page, "Dev Admin");
    await page.goto("/security/permissions");
    // Should see the permissions manager with sub-tabs
    await expect(page.getByText("Admin Permissions")).toBeVisible();
    await expect(page.getByText("Service Access")).toBeVisible();
  });

  test("Admin can view services page", async ({ page }) => {
    await loginAs(page, "Dev Admin");
    await page.goto("/security/services");
    // Should see the OAuth clients table with the seeded admin client
    await expect(
      page.getByRole("table").getByText("PMH Admin")
    ).toBeVisible({ timeout: 10_000 });
  });
});

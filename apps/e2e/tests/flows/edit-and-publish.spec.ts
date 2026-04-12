import { expect, test } from "@playwright/test";
import { loginAs } from "../helpers/login";

const SITE_URL = process.env.E2E_SITE_URL ?? "http://site:3000";

/**
 * Cross-app flow: an Admin opens a new page in the editor, saves it, and
 * then visits the public site to confirm the page renders. Exercises:
 *   - admin auth (next-auth → mock OIDC → session cookie)
 *   - admin editor load at /web/editor/<path> (uses defaultPageData)
 *   - savePage() server action (permission check + MongoService write)
 *   - site ISR on-demand render of a brand new path
 *   - the shared MongoDB as the source of truth between the two apps
 *
 * Doesn't drive Puck's component palette — default page data is enough
 * to verify the full round trip. Content-level assertions can come later.
 */

const pagePath = "/e2e-smoke";

test("admin saves a new page, site renders it", async ({ page, context }) => {
  // Log in as Admin and open the editor for a fresh path. The admin's
  // editor route falls back to `defaultPageData` when no page exists at
  // the requested path, so this creates a blank new page to save.
  await loginAs(page, "Dev Admin");
  await page.goto(`/web/editor${pagePath}`);

  // Wait for the Puck editor shell to load. The header contains the
  // "Editing <path>" text from PageEditor.tsx.
  await expect(page.getByText(`Editing ${pagePath}`)).toBeVisible({
    timeout: 30_000,
  });

  // Click Save Changes. The save handler is a server action that hits
  // the admin's permission guard and then MongoService.savePage().
  await page.getByRole("button", { name: /save changes/i }).click();

  // Wait for the toast confirming the save.
  await expect(page.getByText(/page saved successfully/i)).toBeVisible({
    timeout: 15_000,
  });

  // Now hit the public site at the same path. Admin and site are
  // different origins, so navigate absolutely via the configured
  // SITE_URL (defaults to the compose service name).
  const sitePage = await context.newPage();
  const response = await sitePage.goto(`${SITE_URL}${pagePath}`);

  // The site should successfully render the page (ISR on-demand).
  expect(response?.status()).toBe(200);

  // defaultPageData sets root.props.title = "New Page". The site's
  // generateMetadata() surfaces that as the <title>.
  await expect(sitePage).toHaveTitle(/New Page/);
});

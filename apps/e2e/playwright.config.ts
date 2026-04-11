import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests are designed to run inside docker compose against fully
 * containerized admin, site, mongo, and mock-oidc services. The runner
 * itself is the `e2e-runner` service in `docker-compose.e2e.yml` — it
 * uses Playwright's official image (which ships with Chromium + all
 * system deps), so the host only needs Docker.
 *
 * URL overrides come from the environment. Defaults use the docker
 * compose service names; override them to point at a local stack if
 * you want to iterate against `bun run dev` on the host.
 */

const ADMIN_URL = process.env.E2E_ADMIN_URL ?? "http://admin:3001";
const SITE_URL = process.env.E2E_SITE_URL ?? "http://site:3000";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false, // tests share a single mongo instance
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",

  use: {
    baseURL: ADMIN_URL,
    trace: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

export { ADMIN_URL, SITE_URL };

# Thin runner image for the e2e tests. The Playwright image ships
# chromium + every system lib at /ms-playwright and sets
# PLAYWRIGHT_BROWSERS_PATH accordingly, so we only need the test runner
# itself installed against that exact browser build.
FROM mcr.microsoft.com/playwright:v1.59.1-jammy

# Run as UID 1000 (matches `battino` on the host) so playwright's
# traces/test-results land on the bind-mounted host dir with the right
# ownership instead of being root-owned. /work has to be created and
# chowned before we drop privileges — WORKDIR can't do that itself.
RUN mkdir -p /work/e2e && chown -R 1000:1000 /work
USER 1000:1000

WORKDIR /work/e2e

# Install deps first so this layer is cached across test-file edits.
# `.dockerignore` already excludes node_modules + .git, so the COPY
# below only picks up sources.
COPY --chown=1000:1000 apps/e2e/package.json ./
RUN npm install --no-package-lock --no-audit --no-fund

COPY --chown=1000:1000 apps/e2e/ ./

# Run all tests using the playwright config auto-detected in cwd.
CMD ["npx", "playwright", "test"]

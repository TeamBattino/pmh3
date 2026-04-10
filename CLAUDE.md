# CLAUDE.md

## Project Overview

Turborepo monorepo for Pfadi Meilen Herrliberg — a CMS built with Puck (visual page builder) and Next.js.

- `apps/admin` — CMS admin app (port 3001). Auth via Keycloak/next-auth, Puck editors, role-based permissions.
- `apps/site` — Public read-only site (port 3000). SSR, no auth. Renders Puck data from MongoDB.
- `packages/puck-web` — Shared Puck components, configs, UI primitives, theme CSS. Used by both apps.
- `packages/graphics` — Shared SVG components.

## Commands

```bash
bun run dev          # both apps
bun run dev:admin    # admin only
bun run dev:site     # site only
bun run build        # turbo build (both)
bun run storybook    # storybook at root
```

## Environment

Single `.env` at root. Both apps symlink to it (`apps/admin/.env` → `../../.env`). Site needs only `MONGODB_CONNECTION_STRING` and `MONGODB_DB_NAME`. Admin needs those plus all `AUTH_*` vars and `MOCK_AUTH`.

## Critical: CSS Theme Coexistence

The puck-web package defines a Tailwind v4 `@theme` block in `packages/puck-web/styles/theme.css` with color tokens like `--color-primary` (orange/brown site palette), `--color-ground`, `--color-elevated`, etc. The admin app uses shadcn which also wants `--color-primary`.

**These collide.** The puck-web `@theme` must win because the Puck editor iframe preview depends on those tokens rendering with the site's colors. The admin's shadcn tokens must use a different namespace — currently `--sidebar-primary` instead of `--primary`. Any future shadcn additions must avoid `--color-primary`, `--color-secondary`, `--color-ground`, `--color-elevated`, `--color-contrast-*` names.

## Critical: Puck Editor Iframe

The Puck editor renders previews in an **iframe**. The iframe gets its CSS from `<style>`/`<link>` tags copied from the parent page. Important implications:

- `next/font` CSS variables (set via body className) do NOT propagate into the iframe. Font `@font-face` rules must be declared in the admin's `globals.css` directly, referencing files in `public/fonts/`.
- The `@source` directive in the admin CSS must point to workspace packages so Tailwind generates classes like `bg-ground`, `content-main`, `full` that puck-web components use.
- The correct relative path from `apps/admin/app/globals.css` to packages is `../../../packages/...` (three levels up to repo root).

## Critical: Tailwind v4 Source Scanning

Tailwind v4 only auto-scans the app's own directory. Workspace packages are NOT scanned unless you add `@source` directives in the app's CSS:

```css
@source "../../../packages/puck-web";
@source "../../../packages/graphics/src";
```

The path is relative to the CSS file location (`apps/{app}/app/globals.css`), not the project root. Getting the depth wrong (e.g. `../../` instead of `../../../`) silently fails — classes from packages just won't be generated.

## Puck Editor Config

- Page config uses `sectionThemedConfig()` which wraps each component in `SectionThemedComponent` (applies `mud-theme`/`sun-theme` + `bg-ground` + `content-main`).
- Navbar and footer configs do NOT use section theming. Their editor previews need a manual `PreviewRoot` wrapper with `mud-theme bg-ground font-poppins` to look correct.
- The `iframe: { enabled: true }` prop on `<Puck>` controls iframe rendering. Keep it enabled.

## Permissions

String literals in `lib/security/security-config.ts`. Key ones: `admin-ui:read`, `page:create/update/delete`, `navbar:update`, `footer:update`, `role-permissions:read/update`, `global-admin` (grants all). Use `<PermissionGuard>` client-side, `requireServerPermission()` server-side.

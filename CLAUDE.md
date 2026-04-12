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

The puck-web package defines a Tailwind v4 `@theme` block in `packages/puck-web/styles/theme.css` that claims the `--color-primary`, `--color-secondary`, `--color-ground`, `--color-elevated`, and `--color-contrast-*` names for the site's brand palette (orange/brown). Those tokens are declared as self-referential fallbacks (`--color-primary: var(--color-primary)`) that only resolve inside a `.mud-theme` or `.sun-theme` wrapper — this is intentional so Puck preview content themes correctly per section.

**Consequence for the admin app.** The admin imports puck-web's `theme.css` (so the Puck editor iframe inherits the brand palette) but has NO theme class on `<body>`. That means in the admin chrome, `bg-primary`, `text-primary`, `border-primary`, `ring-primary`, `bg-secondary`, and `text-secondary-foreground` all resolve to an invalid circular reference and silently render as transparent/unset. **Never use these raw class names in admin components.**

**Admin-side convention.** The admin registers its own namespaced tokens in `apps/admin/app/globals.css`:

- `--admin-primary` / `--admin-primary-foreground` — the admin's "primary action" color (dark neutral in light mode, near-white in dark mode). Used via `bg-admin-primary`, `text-admin-primary-foreground`, `border-admin-primary`, `ring-admin-primary`, `bg-admin-primary/N`, etc. This is the shadcn equivalent of `bg-primary`.
- For "secondary" styling, use `bg-muted` + `text-foreground` (both already registered via `@theme inline`). There is no `--admin-secondary` — the admin's muted/accent/secondary surfaces all share the same light-gray value, so one token covers it.
- shadcn's standard neutral tokens that DO work in admin (registered in `@theme inline`): `bg-background`, `bg-card`, `bg-popover`, `bg-muted`, `bg-accent`, `bg-destructive`, `border-border`, `ring-ring`, `bg-input`, and all `*-foreground` variants. Sidebar-scoped tokens (`bg-sidebar`, `bg-sidebar-primary`, `bg-sidebar-accent`, etc.) also work and are reserved for the actual Sidebar component.

**Rules for future additions.**

1. Any shadcn component added via `shadcn add` that ships with `bg-primary`/`text-primary`/`bg-secondary`/`border-primary`/`ring-primary` must be rewritten to use `bg-admin-primary` etc. before it will render correctly.
2. Do not register `--color-primary`, `--color-secondary`, `--color-ground`, `--color-elevated`, or `--color-contrast-*` in the admin's `@theme inline` block — they belong to puck-web.
3. Never run `shadcn init` / `shadcn init --preset` against `apps/admin`. It will overwrite `globals.css`, destroying the `@source` directives, `@font-face` declarations, the puck-web theme import, and the `--admin-primary` namespace. Cherry-pick tokens manually instead.
4. If you need an additional admin-scoped color, follow the same pattern: declare `--admin-<name>` in `:root` and `.dark`, then register `--color-admin-<name>: var(--admin-<name>)` in `@theme inline`. Never collide with puck-web's reserved names.

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

## Critical: Puck Render Functions Must Be Server Components

Puck's RSC `Render` (resolved via the `react-server` conditional export, `@puckeditor/core/dist/rsc.mjs`) injects `puck: { renderDropZone, dragRef, metadata, isEditing }` into the props of every registered `ComponentConfig.render` (and `root.render`). `renderDropZone` and `dragRef` are functions — they **cannot cross a server→client boundary**. The site 500s with *"Functions cannot be passed directly to Client Components"* on every page render otherwise.

**Rules.**

1. Any function registered as `ComponentConfig.render` or `root.render` (and any wrapper in between, like `sectionThemedComponentConfig`'s `SectionThemedRender`) must be a server component — **no `"use client"` at the top of that file**.
2. No Client Component may sit in the ancestry of `<config.render {...props} />` such that the element is serialized as its child. In particular, do **not** wrap children in a client-only context provider inside the Puck render path. If you need to share values with Puck-rendered components, inject them as plain props via the data layer (see `applySectionTheming`) instead of React context.
3. For interactive leaves, split the component: the outer, config-registered render stays server-side; a separate `"use client"` inner component (like `FAQItem`) holds the state. Pass only serializable data to the client leaf — never forward the `puck` prop.
4. Puck's own `DropZone` (returned by `renderDropZone`) is already a Client Component and is safe to render — its props (`zone`, `allow`) are serializable.

## Permissions

String literals in `lib/security/security-config.ts`. Key ones: `admin-ui:read`, `page:create/update/delete`, `navbar:update`, `footer:update`, `role-permissions:read/update`, `global-admin` (grants all). Use `<PermissionGuard>` client-side, `requireServerPermission()` server-side.

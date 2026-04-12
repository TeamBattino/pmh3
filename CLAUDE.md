# CLAUDE.md

## Project Overview

Turborepo monorepo for Pfadi Meilen Herrliberg — a CMS built with Puck (visual page builder) and Next.js.

- `apps/admin` — CMS admin app (port 3001). Auth via Keycloak/next-auth, Puck editors, role-based permissions.
- `apps/site` — Public read-only site (port 3000). SSR, no auth. Renders Puck data from MongoDB.
- `packages/puck-web` — Shared Puck components, configs, UI primitives, theme CSS. Used by both apps.
- `packages/graphics` — Shared SVG components.

## Commands

```bash
npm run dev          # both apps (use npm, not bun — see Runtime below)
npm run dev:admin    # admin only
npm run dev:site     # site only
bun install          # Bun is kept for install speed + lockfile
bun run build        # build is runtime-agnostic, Bun is fine here
bun run storybook    # storybook at root
```

## Critical: Runtime is Node, not Bun

`apps/site` and `apps/admin` must run under **Node**, never under Bun. Puck's rich-text SSR pipeline (`@tiptap/html/server`) uses `happy-dom`, which bootstraps globals like `SyntaxError` onto its synthetic `Window` via Node's built-in `vm.Script.runInContext()`. Bun's `vm` implementation doesn't complete that bootstrap, so `window.SyntaxError` ends up undefined and the first CSS-selector match (e.g. tiptap's Heading extension parsing HTML) crashes with *"undefined is not a constructor"* on `new this.window.SyntaxError(...)`. This is a runtime gap — no bundler / Next config knob can fix it.

**Production.** Both Dockerfiles (`apps/site/Dockerfile`, `apps/admin/Dockerfile`) install + build with Bun (fast), but the final `runner` stage is `node:22-alpine` and the container runs `node apps/<app>/server.js`.

**Development.** Install Node 22 locally (e.g. `nvm install 22`, `fnm install 22`). Use `npm run dev` / `npm run dev:site` / `npm run dev:admin`. Do **not** use `bun run dev` — Bun injects a `node` shim into `PATH` for every script it runs (at `/tmp/bun-node-*/node`) that silently redirects to Bun, so even `node …` commands inside the script end up on Bun. Script-level tricks (`env node`, `sh -c`, absolute paths) don't survive this. The auth service (`apps/auth`) is Bun-only and is unaffected.

**Bun is still the package manager.** `bun install` is fast and the `bun.lock` is authoritative. Only the *runtime* needs to be Node.

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

## Critical: Rich Text Parses Through Happy-Dom

Puck's admin editor saves every `type: "richtext"` field value as an **HTML string** (via `editor.getHTML()`). On the site, Puck's RSC `RichTextRender` detects the HTML string at render time and calls `generateJSON(html, extensions)` from `@tiptap/html/server` — which uses `happy-dom` to parse HTML and run each tiptap extension's `parseHTML` selector rules. This requires Node (see *Runtime* above). Plain paragraphs happen to bypass some selector matching; headings (or any extension with meaningful `parseHTML` rules) always trigger it.

Long-term, storing rich text as tiptap JSON (`{ type: "doc", content: [...] }`) on save would skip the parse on every render — but currently we don't do that conversion. If you add it, do the `generateJSON` call in a `savePage`/`saveNavbar`/`saveFooter` server action; Node handles happy-dom fine. Do not attempt to do it at render time on Bun.

## Critical: Puck Render Functions Must Be Server Components

Puck's RSC `Render` (resolved via the `react-server` conditional export, `@puckeditor/core/dist/rsc.mjs`) injects `puck: { renderDropZone, dragRef, metadata, isEditing }` into the props of every registered `ComponentConfig.render` (and `root.render`). `renderDropZone` and `dragRef` are functions — they **cannot cross a server→client boundary**. The site 500s with *"Functions cannot be passed directly to Client Components"* on every page render otherwise.

**Rules.**

1. Any function registered as `ComponentConfig.render` or `root.render` (and any wrapper in between, like `sectionThemedComponentConfig`'s `SectionThemedRender`) must be a server component — **no `"use client"` at the top of that file**.
2. No Client Component may sit in the ancestry of `<config.render {...props} />` such that the element is serialized as its child. In particular, do **not** wrap children in a client-only context provider inside the Puck render path. If you need to share values with Puck-rendered components, inject them as plain props via the data layer (see `applySectionTheming`) instead of React context.
3. For interactive leaves, split the component: the outer, config-registered render stays server-side; a separate `"use client"` inner component (like `FAQItem`) holds the state. Pass only serializable data to the client leaf — never forward the `puck` prop.
4. Puck's own `DropZone` (returned by `renderDropZone`) is already a Client Component and is safe to render — its props (`zone`, `allow`) are serializable.

## Permissions

String literals in `lib/security/security-config.ts`. Key ones: `admin-ui:read`, `page:create/update/delete`, `navbar:update`, `footer:update`, `role-permissions:read/update`, `global-admin` (grants all). Use `<PermissionGuard>` client-side, `requireServerPermission()` server-side.

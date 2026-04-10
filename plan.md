# Monorepo Migration Plan: pfadipuck -> Turborepo

## Architecture

```
                ┌─────────────┐
                │   MongoDB   │
                └──────┬──────┘
                       │
          ┌────────────┼────────────┐
          │ read/write  │  read-only │
          ▼            │            ▼
   ┌─────────────┐     │     ┌─────────────┐
   │  Admin App  │     │     │  Site App   │
   │  (secured)  │     │     │  (public)   │
   │             │     │     │             │
   │ • Puck editor    │     │ • Renders   │
   │ • Auth/Keycloak  │     │   pages     │
   │ • Permissions    │     │ • No auth   │
   │ • Page CRUD      │     │ • No login  │
   │ • Role mgmt      │     │ • No write  │
   │ • Navbar/Footer  │     │ • Pure      │
   │   editing        │     │   display   │
   └─────────────┘     │     └─────────────┘
          │            │            │
          └────────────┼────────────┘
                       │
              ┌────────┴────────┐
              │ Shared Packages │
              │ (puck-web,      │
              │  graphics)      │
              └─────────────────┘
```

**Admin** = the full CMS. Auth, Puck editor, permissions, page/navbar/footer CRUD, security config. Reads and writes MongoDB.

**Site** = a pure rendering frontend. Connects to MongoDB read-only (just `getPage`, `getNavbar`, `getFooter`). No auth, no login page, no session, no permissions. Renders what the admin put there.

---

## Target Directory Structure

```
pfadipuck/
├── turbo.json
├── package.json                          # Root: workspaces + turbo scripts
├── docker-compose.yml                    # MongoDB (stays at root)
├── .env.example
│
├── apps/
│   ├── admin/                            # Admin Next.js app — the CMS
│   │   ├── app/
│   │   │   ├── layout.tsx                # Admin root layout (admin-theme, SessionProvider)
│   │   │   ├── globals.css               # Admin styles + shared theme import
│   │   │   ├── page.tsx                  # Dashboard — page management table
│   │   │   ├── editor/
│   │   │   │   └── [[...editPath]]/page.tsx  # Puck page editor
│   │   │   ├── navbar/page.tsx           # Puck navbar editor
│   │   │   ├── footer/page.tsx           # Puck footer editor
│   │   │   ├── security/page.tsx         # Role/permission management
│   │   │   ├── login/page.tsx            # Admin login page
│   │   │   └── auth/
│   │   │       ├── [...nextauth]/route.ts  # NextAuth route handler
│   │   │       └── dev/signin/page.tsx     # Dev mock sign-in
│   │   ├── components/                   # Admin-only components (use puck-web/ui for primitives)
│   │   │   ├── AdminPage.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── PageRow.tsx
│   │   │   ├── AddPageModal.tsx
│   │   │   ├── ConfirmModal.tsx
│   │   │   ├── SecurityManager.tsx
│   │   │   ├── SecurityHeader.tsx
│   │   │   ├── RoleRow.tsx
│   │   │   ├── RoleModal.tsx
│   │   │   ├── PuckHeader.tsx
│   │   │   ├── PageHeaderActions.tsx
│   │   │   ├── OtherHeaderActions.tsx
│   │   │   ├── UndoRedoButtons.tsx
│   │   │   ├── PageEditor.tsx
│   │   │   ├── NavbarEditor.tsx
│   │   │   ├── FooterEditor.tsx
│   │   │   └── Providers.tsx             # SessionProvider + QueryClient + Toaster
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   ├── postcss.config.js
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── site/                             # Public Next.js app — pure rendering
│       ├── app/
│       │   ├── layout.tsx                # Site root layout (mud-theme, ParallaxProvider)
│       │   ├── globals.css               # Site styles (sun/mud themes)
│       │   └── [[...puckPath]]/page.tsx  # Catch-all: reads MongoDB + renders (SSR)
│       ├── components/                   # Site-only rendering components
│       │   ├── Providers.tsx             # QueryClientProvider (safety net for Puck components)
│       │   ├── PageRender.tsx
│       │   ├── Parallax.tsx
│       │   ├── ParallaxRender.tsx
│       │   ├── SectionThemedComponent.tsx
│       │   ├── navbar/
│       │   │   ├── NavbarRender.tsx
│       │   │   ├── NavbarItemsDesktop.tsx
│       │   │   ├── NavbarItemsMobile.tsx
│       │   │   ├── NavbarLogo.tsx
│       │   │   ├── NavbarDropdownDesktop.tsx
│       │   │   └── NavbarDropdownMobile.tsx
│       │   └── footer/
│       │       └── (footer render components if any)
│       ├── lib/
│       │   └── db.ts                     # Thin read-only DB access (getPage, getNavbar, getFooter)
│       ├── next.config.ts
│       ├── tsconfig.json
│       ├── postcss.config.js
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   ├── puck-web/                         # Everything shared between editor + renderer
│   │   ├── components/                   # Puck-registered components (have ComponentConfig)
│   │   │   ├── Flex.tsx
│   │   │   ├── Graphic.tsx
│   │   │   ├── Heading.tsx
│   │   │   ├── Hero.tsx
│   │   │   ├── IFrame.tsx
│   │   │   ├── SectionDivider.tsx
│   │   │   ├── Text.tsx
│   │   │   ├── VerticalSpace.tsx
│   │   │   └── navbar/
│   │   │       ├── NavbarDropdown.tsx
│   │   │       └── NavbarItem.tsx
│   │   ├── ui/                           # Shared UI (no Puck config, site-themed)
│   │   │   ├── Button.tsx                # Site-themed button (used by admin + puck overrides)
│   │   │   ├── Card.tsx                  # Elevated container
│   │   │   ├── Dialog.tsx                # Modal dialog (radix-based, site-themed)
│   │   │   ├── Input.tsx                 # Text input (site-themed)
│   │   │   ├── Table.tsx                 # Data table
│   │   │   ├── Toast.tsx                 # Sonner toast (site-themed)
│   │   │   ├── ErrorLabel.tsx            # Error message display
│   │   │   ├── SectionBreak.tsx          # Visual section divider (used by SectionDivider)
│   │   │   ├── StaticImage.tsx           # Image rendering (used by Graphic, Hero)
│   │   │   ├── ParallaxRender.tsx        # Parallax wrapper (used by Graphic)
│   │   │   ├── SectionThemedComponent.tsx # Wraps components in sun/mud theme
│   │   │   ├── SectionThemeProvider.tsx   # Theme context provider
│   │   │   └── ClickAwayListener.tsx     # Click-outside detection
│   │   ├── config/                       # Puck component registries
│   │   │   ├── page.config.ts            # Page builder schema
│   │   │   ├── navbar.config.ts          # Navbar builder schema
│   │   │   └── footer.config.ts          # Footer builder schema
│   │   ├── lib/                          # Internal utilities
│   │   │   ├── section-theming.tsx        # Sun/mud theme alternation logic
│   │   │   ├── custom-field-types.ts     # Puck custom field type definitions
│   │   │   ├── section-theme-context.tsx  # React context for current theme
│   │   │   └── cn.ts                     # Class name merge utility
│   │   ├── fields/                       # Custom Puck field editors
│   │   │   └── upload-file.tsx
│   │   ├── overrides/                    # Puck editor UI customization
│   │   │   └── PuckSectionThemeUpdater.tsx # Live theme updating in editor
│   │   ├── styles/
│   │   │   └── theme.css                 # Shared CSS (sun, mud themes, grid layout)
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── graphics/                         # SVG components (shared by both apps)
│   │   ├── src/
│   │   │   ├── *.tsx                     # All SVG components
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── eslint-config/                    # Shared ESLint config
│   │   ├── base.js
│   │   ├── next.js
│   │   └── package.json
│   │
│   └── typescript-config/                # Shared tsconfig bases
│       ├── base.json
│       ├── nextjs.json
│       └── package.json
```

---

## What Goes Where — Every File Mapped

### `apps/admin` — Owns ALL secure/write functionality

| Current Location | Destination | Why |
|---|---|---|
| `app/admin/page.tsx` | `apps/admin/app/page.tsx` | Dashboard (drops `/admin` prefix) |
| `app/admin/editor/[[...editPath]]/page.tsx` | `apps/admin/app/editor/...` | Puck page editor |
| `app/admin/navbar/page.tsx` | `apps/admin/app/navbar/page.tsx` | Puck navbar editor |
| `app/admin/footer/page.tsx` | `apps/admin/app/footer/page.tsx` | Puck footer editor |
| `app/admin/security/page.tsx` | `apps/admin/app/security/page.tsx` | Role/permission mgmt |
| `app/admin/layout.tsx` | Merged into `apps/admin/app/layout.tsx` | Admin-theme is the default now |
| `app/auth/[...nextauth]/route.ts` | `apps/admin/app/auth/.../route.ts` | Auth only lives in admin |
| `app/auth/dev/signin/page.tsx` | `apps/admin/app/auth/dev/signin/page.tsx` | Dev mock auth |
| `app/login/page.tsx` | `apps/admin/app/login/page.tsx` | Only admin needs login |
| `app/layout.tsx` | Split between both apps | Admin gets session + providers |
| `components/page/admin/*` | `apps/admin/components/` | Admin dashboard components |
| `components/page/security/*` | `apps/admin/components/` | Security management components |
| `components/puck-overrides/*` | `apps/admin/components/` | Puck editor UI overrides |
| `components/page/PageEditor.tsx` | `apps/admin/components/` | Client-side Puck editor |
| `components/navbar/NavbarEditor.tsx` | `apps/admin/components/` | Navbar editor |
| `components/footer/FooterEditor.tsx` | `apps/admin/components/` | Footer editor |
| `components/security/*` | `apps/admin/components/` | PermissionGuard, ServerPermissionGuard |
| `components/security/dev/*` | `apps/admin/components/` | DevSignInForm, DevSignInLink |
| `lib/auth/*` | `apps/admin/lib/auth/` | Auth config (Keycloak, mock) |
| `lib/security/*` | `apps/admin/lib/security/` | Permissions, guards, evaluator |
| `lib/db/db.ts` | `apps/admin/lib/db/` | Full DB service (read + write) |
| `lib/db/db-actions.ts` | `apps/admin/lib/db/` | Server actions with permission checks |
| `lib/db/db-mongo-impl.ts` | `apps/admin/lib/db/` | MongoDB implementation |
| `lib/db/db-mock-impl.ts` | `apps/admin/lib/db/` | Mock DB for dev |
| `lib/env.ts` | `apps/admin/lib/env.ts` | Admin needs all env vars |
| `lib/query-client.ts` | `apps/admin/lib/` | React Query (admin uses mutations) |
| `components/Providers.tsx` | `apps/admin/components/Providers.tsx` | Session + QueryClient + Toaster |

Admin components import UI primitives (Button, Dialog, Table, etc.) from
`@pfadipuck/puck-web/ui/*`. These are site-themed components that work for the
current admin UI. In a future phase, admin will get its own shadcn-based UI.

### `apps/site` — Pure read-only rendering, zero auth

| Current Location | Destination | Why |
|---|---|---|
| `app/[[...puckPath]]/page.tsx` | `apps/site/app/[[...puckPath]]/page.tsx` | Catch-all page renderer |
| `components/page/PageRender.tsx` | `apps/site/components/PageRender.tsx` | Renders navbar + page + footer |
| `components/page/Parallax.tsx` | `apps/site/components/` | Parallax scrolling |
| `components/navbar/NavbarRender.tsx` | `apps/site/components/navbar/` | Navbar rendering |
| `components/navbar/NavbarItems*.tsx` | `apps/site/components/navbar/` | Desktop/mobile nav items |
| `components/navbar/NavbarLogo.tsx` | `apps/site/components/navbar/` | Logo component |
| `components/navbar/NavbarDropdown*.tsx` | `apps/site/components/navbar/` | Dropdown menus |

**Site does NOT get:**
- `next-auth` / `SessionProvider` / any auth
- `lib/security/*` / permission guards
- `lib/db/db-actions.ts` (server actions with permission checks)
- Login page
- `sonner` / toast notifications
- shadcn/ui components
- `@measured/puck` editor (only `<Render>`)

**Site's DB access** is a thin, purpose-built module:

```typescript
// apps/site/lib/db.ts
import { MongoClient } from "mongodb";

// Cache the client on globalThis to survive HMR in dev and avoid
// creating a new connection per serverless invocation in production.
// Without this, each request could open a fresh TCP connection to
// MongoDB, exhaust the connection pool, and cause timeouts under load.
const globalForMongo = globalThis as unknown as { _mongoClient?: MongoClient };
const client = globalForMongo._mongoClient ??= new MongoClient(process.env.MONGODB_CONNECTION_STRING!);
const db = client.db(process.env.MONGODB_DB_NAME!);
const collection = db.collection("puck-data");

export async function getPage(path: string) {
  return collection.findOne({ type: "page", path });
}

export async function getNavbar() {
  return collection.findOne({ type: "navbar" });
}

export async function getFooter() {
  return collection.findOne({ type: "footer" });
}
```

No interface, no abstraction, no mock implementation, no permission checks. Just three
queries with a cached connection. The `globalThis` pattern is the standard approach for
Next.js + MongoDB — it ensures a single `MongoClient` instance is reused across requests
in development (where HMR re-evaluates modules) and in production (where serverless
functions may share a warm container). Without it, every request risks opening a new
connection, eventually exhausting MongoDB's connection pool limit.

### `packages/puck-web` — Shared between editor (admin) and renderer (site)

This package has clear internal structure separating components-with-configs from shared UI helpers:

**`components/`** — Puck-registered components (each exports a `ComponentConfig`)

| Current Location | Destination |
|---|---|
| `components/puck/Flex.tsx` | `packages/puck-web/components/Flex.tsx` |
| `components/puck/Graphic.tsx` | `packages/puck-web/components/Graphic.tsx` |
| `components/puck/Heading.tsx` | `packages/puck-web/components/Heading.tsx` |
| `components/puck/Hero.tsx` | `packages/puck-web/components/Hero.tsx` |
| `components/puck/IFrame.tsx` | `packages/puck-web/components/IFrame.tsx` |
| `components/puck/SectionDivider.tsx` | `packages/puck-web/components/SectionDivider.tsx` |
| `components/puck/Text.tsx` | `packages/puck-web/components/Text.tsx` |
| `components/puck/VerticalSpace.tsx` | `packages/puck-web/components/VerticalSpace.tsx` |
| `components/puck/navbar/NavbarDropdown.tsx` | `packages/puck-web/components/navbar/NavbarDropdown.tsx` |
| `components/puck/navbar/NavbarItem.tsx` | `packages/puck-web/components/navbar/NavbarItem.tsx` |

**`ui/`** — Shared UI components (site-themed, no Puck config)

These are the current custom-styled UI primitives. They use the site's theme tokens
(`bg-primary`, `bg-elevated`, `text-contrast-ground`, `font-rockingsoda`). Both admin
and site can use them. In a future phase, admin will replace these with shadcn components.

| Current Location | Destination |
|---|---|
| `components/ui/Button.tsx` | `packages/puck-web/ui/Button.tsx` |
| `components/ui/Card.tsx` | `packages/puck-web/ui/Card.tsx` |
| `components/ui/Dialog.tsx` | `packages/puck-web/ui/Dialog.tsx` |
| `components/ui/Input.tsx` | `packages/puck-web/ui/Input.tsx` |
| `components/ui/Table.tsx` | `packages/puck-web/ui/Table.tsx` |
| `components/ui/Toast.tsx` | `apps/admin/components/ui/Toast.tsx` |
| `components/ui/ErrorLabel.tsx` | `packages/puck-web/ui/ErrorLabel.tsx` |
| `components/misc/SectionBreak.tsx` | `packages/puck-web/ui/SectionBreak.tsx` |
| `components/misc/StaticImage.tsx` | `packages/puck-web/ui/StaticImage.tsx` |
| `components/page/ParallaxRender.tsx` | `packages/puck-web/ui/ParallaxRender.tsx` |
| `components/page/SectionThemedComponent.tsx` | `packages/puck-web/ui/SectionThemedComponent.tsx` |
| `components/contexts/SectionThemeProvider.tsx` | `packages/puck-web/ui/SectionThemeProvider.tsx` |
| `components/misc/ClickAwayListener.tsx` | `packages/puck-web/ui/ClickAwayListener.tsx` |

**`config/`** — Puck component registries (shared between editor and renderer)

| Current Location | Destination |
|---|---|
| `lib/config/page.config.ts` | `packages/puck-web/config/page.config.ts` |
| `lib/config/navbar.config.ts` | `packages/puck-web/config/navbar.config.ts` |
| `lib/config/footer.config.ts` | `packages/puck-web/config/footer.config.ts` |

**`lib/`** — Internal utilities

| Current Location | Destination |
|---|---|
| `lib/section-theming.tsx` | `packages/puck-web/lib/section-theming.tsx` |
| `lib/custom-field-types.ts` | `packages/puck-web/lib/custom-field-types.ts` |
| `lib/contexts/section-theme-context.tsx` | `packages/puck-web/lib/section-theme-context.tsx` |
| `lib/cn.ts` | `packages/puck-web/lib/cn.ts` |

**`fields/`** — Custom Puck field editors

| Current Location | Destination |
|---|---|
| `components/puck-fields/upload-file.tsx` | `packages/puck-web/fields/upload-file.tsx` |

**Overrides** — Puck editor UI customization lives in admin (editor-only, never used by site):

| Current Location | Destination |
|---|---|
| `components/misc/PuckSectionThemeUpdater.tsx` | `apps/admin/components/PuckSectionThemeUpdater.tsx` |

**`styles/`** — Shared CSS

| Current Location | Destination |
|---|---|
| `app/globals.css` (theme portions) | `packages/puck-web/styles/theme.css` |

### `packages/graphics` — SVGs

All `components/graphics/*.tsx` files. Used by puck-web components (SectionBreakSvgs in SectionBreak, PostHeroSvg in Hero, UploadFileSvg in upload-file), site navbar (hamburger, dropdown arrow), and admin (sidebar toggles, spinner).

### What stays at root

| File | Why |
|---|---|
| `docker-compose.yml` | Shared infrastructure |
| `.env.example` | Reference for both apps |
| `vitest.config.ts` | Can stay at root or move per-app |
| `.storybook/` | Can stay at root, pointing at admin's `components/ui` and `packages/puck-web` |
| `stories/` | Move into relevant packages or admin |

### What gets deleted

| File | Why |
|---|---|
| `app/` (root) | Replaced by `apps/admin/app/` and `apps/site/app/` |
| `components/` (root) | Distributed across admin app and packages |
| `lib/` (root) | Distributed across admin app and packages |
| `components/ui/Button.module.css` | Already deleted |
| `components/ui/ErrorLabel.*` | Already deleted |

---

## Environment Variables

### Admin app — needs everything

```env
AUTH_SECRET=...
AUTH_KEYCLOAK_ID=...
AUTH_KEYCLOAK_SECRET=...
AUTH_KEYCLOAK_ISSUER=...
MOCK_AUTH=true                    # Dev only
MONGODB_CONNECTION_STRING=...
MONGODB_DB_NAME=...
```

### Site app — needs only MongoDB

```env
MONGODB_CONNECTION_STRING=...
MONGODB_DB_NAME=...
```

That's it. No auth secrets, no Keycloak config. The site has no reason to know about authentication.

Each app has its own `env.ts` validation. The admin's validates all vars. The site's validates just the two MongoDB vars.

---

## Dependency Graph

```
apps/admin ──┬──> @pfadipuck/puck-web     (configs, components, UI, theme CSS)
             ├──> @pfadipuck/graphics
             ├──> @measured/puck          (editor + render)
             ├──> next-auth               (Keycloak auth)
             ├──> @tanstack/react-query   (mutations + cache)
             ├──> sonner                  (toast notifications)
             └──> mongodb                 (read + write)

apps/site  ──┬──> @pfadipuck/puck-web     (configs, components, ui helpers, theme CSS)
             ├──> @pfadipuck/graphics
             ├──> @measured/puck          (render only — see note below)
             ├──> @tanstack/react-query   (passive — safety net for Puck components)
             ├──> mongodb                 (read-only)
             └──> react-scroll-parallax   (parallax effects)

@pfadipuck/puck-web ──> @pfadipuck/graphics, radix-ui, clsx, tailwind-merge
```

**Note on `@measured/puck` in site:** The site uses Puck's `<Render>` component to render page data. This means site still needs `@measured/puck` as a dependency — but only the render path, not the editor. Puck doesn't currently offer a separate render-only package, so both apps depend on it. Tree-shaking should eliminate the editor code from the site bundle. If bundle size becomes an issue, a future optimization would be to write a custom renderer that interprets Puck data without the Puck library.

---

## Package Configs

### Root `package.json`

```json
{
  "name": "pfadipuck",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo dev",
    "dev:admin": "turbo dev --filter=@pfadipuck/admin",
    "dev:site": "turbo dev --filter=@pfadipuck/site",
    "build": "turbo build",
    "build:admin": "turbo build --filter=@pfadipuck/admin",
    "build:site": "turbo build --filter=@pfadipuck/site",
    "lint": "turbo lint",
    "test": "turbo test",
    "storybook": "turbo storybook",
    "type-check": "turbo type-check"
  },
  "devDependencies": {
    "turbo": "^2"
  },
  "packageManager": "bun@1.x"
}
```

### `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {},
    "storybook": {
      "cache": false,
      "persistent": true
    },
    "type-check": {}
  }
}
```

### `apps/admin/package.json`

```json
{
  "name": "@pfadipuck/admin",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "SKIP_ENV_VALIDATION=true next build",
    "start": "next start --port 3001",
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@measured/puck": "^0.18.3",
    "@pfadipuck/graphics": "workspace:*",
    "@pfadipuck/puck-web": "workspace:*",
    "@t3-oss/env-nextjs": "^0.13.10",
    "@tanstack/react-query": "^5.74.4",
    "mongodb": "^6.15.0",
    "next": "^16.2.3",
    "next-auth": "^5.0.0-beta.30",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "sonner": "^2.0.3",
    "zod": "^4.3.4"
  }
}
```

UI primitives (Button, Dialog, Table, etc.) come from `@pfadipuck/puck-web/ui/*`.
Toast lives in `apps/admin/components/ui/` (not shared) since only admin uses toasts.
`radix-ui` is a transitive dep via puck-web. `sonner` is a direct admin dep for Toast.

### `apps/site/package.json`

```json
{
  "name": "@pfadipuck/site",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start --port 3000",
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@measured/puck": "^0.18.3",
    "@pfadipuck/graphics": "workspace:*",
    "@pfadipuck/puck-web": "workspace:*",
    "@tanstack/react-query": "^5.74.4",
    "mongodb": "^6.15.0",
    "next": "^16.2.3",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-scroll-parallax": "^3.4.5"
  }
}
```

**No `next-auth`, no `zod`, no `sonner`, no `radix-ui`** in the site app. `react-query`
is included but passive — it provides `QueryClientProvider` so shared Puck components
that use `useQuery` don't crash, but all page-level data fetching remains server-side.

### `packages/puck-web/package.json`

```json
{
  "name": "@pfadipuck/puck-web",
  "private": true,
  "exports": {
    "./config/*": "./config/*.ts",
    "./components/*": "./components/*.tsx",
    "./ui/*": "./ui/*.tsx",
    "./lib/*": "./lib/*.ts",
    "./fields/*": "./fields/*.tsx",
    "./styles/*": "./styles/*"
  },
  "dependencies": {
    "@pfadipuck/graphics": "workspace:*",
    "clsx": "^2.1.1",
    "radix-ui": "^1.3.0",
    "tailwind-merge": "^3.2.0"
  },
  "peerDependencies": {
    "@measured/puck": "^0.18.3",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  }
}
```

---

## CSS / Tailwind v4 Strategy

### Shared theme (`packages/puck-web/styles/theme.css`)

Extract from the current `globals.css`:
- The full `@theme` block (base colors, theme-dependent colors, shadcn semantic tokens, radius)
- `.sun-theme` class (maps `--color-ground`, `--color-primary`, etc. to sun palette)
- `.mud-theme` class (maps to mud palette)
- `.admin-theme` class (shadcn neutral dark overrides)
- `@layer base` heading styles
- `@layer components` `.content-main` grid layout

**Both apps import this file.** This is what guarantees Puck components look identical
in the admin editor and on the live site. The theme system works per-component, not
per-page: each Puck component gets wrapped in a `<div className="sun-theme ...">` or
`"mud-theme ..."` via `SectionThemedComponent`. Inside the admin editor,
`PuckSectionThemeUpdater` applies these theme props live as you edit. So even though
the admin body is `admin-theme`, the Puck preview area renders components with the
correct sun/mud theming — because the theme CSS classes are scoped to each component's
wrapper div, not the body.

**What makes this work:**
1. `packages/puck-web/styles/theme.css` defines `.sun-theme` and `.mud-theme` CSS classes
2. `packages/puck-web/ui/SectionThemedComponent` wraps each component in
   `<div className="${theme}-theme bg-ground content-main">`
3. `packages/puck-web/overrides/PuckSectionThemeUpdater` runs in the editor to apply
   theme props as sections are added/reordered
4. Both apps import `theme.css`, so the CSS variables resolve correctly everywhere

**Risk:** If the admin app's `globals.css` fails to import the shared theme, the editor
preview will render without sun/mud colors. This is caught immediately — the editor
would show unstyled components.

### Site `globals.css`

```css
@import "tailwindcss";
@import "@pfadipuck/puck-web/styles/theme.css";

body {
  @apply font-poppins bg-ground mud-theme;
}
```

### Admin `globals.css`

```css
@import "tailwindcss";
@import "@pfadipuck/puck-web/styles/theme.css";

body {
  @apply font-poppins bg-background admin-theme;
}
```

### Tailwind content scanning

Each app needs to scan workspace packages for Tailwind classes:

```js
// apps/*/postcss.config.js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {
      content: [
        './app/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './lib/**/*.{ts,tsx}',
        '../../packages/puck-web/**/*.{ts,tsx}',
        '../../packages/graphics/src/**/*.{ts,tsx}',
      ],
    },
  },
};
```

---

## App Layouts

### Site layout (SSR by default, QueryClient as safety net)

```tsx
// apps/site/app/layout.tsx
import { poppins, rockingsodaPlus } from "@/lib/fonts";
import { Providers } from "@/components/Providers";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={cn(rockingsodaPlus.variable, poppins.variable, "font-poppins bg-ground mud-theme")}>
        <Providers>
          <ParallaxProvider>{children}</ParallaxProvider>
        </Providers>
      </body>
    </html>
  );
}
```

```tsx
// apps/site/components/Providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type PropsWithChildren } from "react";

export function Providers({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

No `auth()` call. No `SessionProvider`. No toasts. The `QueryClientProvider` is passive —
it only activates if a Puck component uses `useQuery`. All page routes remain async
server components that fetch data server-side via direct MongoDB reads. The site is
SSR-first; `react-query` is there so shared Puck components that need client-side
fetching don't crash.

### Admin layout (full auth stack)

```tsx
// apps/admin/app/layout.tsx
import { auth } from "@/lib/auth/auth-client";
import { Providers } from "@/components/Providers";
import "./globals.css";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="en">
      <body className="font-poppins bg-background admin-theme">
        <Providers session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

**Note: Admin does NOT need `ParallaxProvider`.** The `ParallaxRender` component checks
for `editMode` — when editing in the admin Puck editor, it renders a static fallback
image instead of the interactive `<Parallax>` component. This means the admin editor
preview works without `react-scroll-parallax` at all.

---

## Fonts Strategy

`next/font` loaders can't be exported from packages (they must run in the Next.js app context). Two options:

**Option A (recommended):** Each app has its own `lib/fonts.ts` that loads the font files from the shared assets location:
```typescript
// apps/site/lib/fonts.ts
import localFont from "next/font/local";

export const rockingsodaPlus = localFont({
  src: "../../packages/puck-web/assets/RockingsodaPlus-Regular.otf",
  variable: "--font-rockingsoda",
});
```

**Option B:** Use `@font-face` declarations in the shared theme CSS, referencing font files served from `public/`. This avoids the `next/font` issue entirely but loses the optimization benefits.

---

## Docker Strategy

Two separate Dockerfiles using `turbo prune` for minimal images:

```dockerfile
# apps/admin/Dockerfile
FROM oven/bun:1 AS base

FROM base AS builder
WORKDIR /app
COPY . .
RUN bunx turbo prune @pfadipuck/admin --docker

FROM base AS installer
WORKDIR /app
COPY --from=builder /app/out/json/ .
RUN bun install
COPY --from=builder /app/out/full/ .
RUN bun run build --filter=@pfadipuck/admin

FROM base AS runner
WORKDIR /app
RUN apt update && apt install -y curl
COPY --from=installer /app/apps/admin/.next/standalone ./
COPY --from=installer /app/apps/admin/.next/static ./apps/admin/.next/static
EXPOSE 3001
CMD ["bun", "run", "apps/admin/server.js"]
```

Same pattern for site on port 3000. The `turbo prune` command creates a minimal workspace with only the target app and its package dependencies — no admin code in the site image and vice versa.

---

## Storybook

Keep Storybook at the monorepo root or in a dedicated `packages/storybook`. Update config to find stories across packages:

```typescript
// .storybook/main.ts
const config = {
  stories: [
    "../packages/puck-web/ui/**/*.stories.@(ts|tsx)",
    "../packages/puck-web/**/*.stories.@(ts|tsx)",
  ],
  staticDirs: ["../packages/puck-web/assets"],
  // ...
};
```

---

## Migration Steps

### Phase 1: Turborepo scaffolding
1. `bun add -D turbo` at root
2. Create `turbo.json`
3. Convert root `package.json` to workspace root (remove app deps, add `workspaces`)
4. Create all package directories with their `package.json` and `tsconfig.json`
5. Create `packages/typescript-config` with shared base configs
6. Create `packages/eslint-config` with shared rules

### Phase 2: Extract `packages/puck-web`
7. Move `components/puck/*` → `packages/puck-web/components/`
8. Move `components/puck-fields/*` → `packages/puck-web/fields/`
9. Move `lib/config/*` → `packages/puck-web/config/`
10. Move `lib/section-theming.tsx`, `lib/custom-field-types.ts`, `lib/contexts/section-theme-context.tsx`, `lib/cn.ts` → `packages/puck-web/lib/`
11. Move `components/ui/*` (Button, Card, Dialog, Input, Table, Toast, ErrorLabel) → `packages/puck-web/ui/`
12. Move `components/misc/SectionBreak.tsx`, `StaticImage.tsx`, `ClickAwayListener.tsx` → `packages/puck-web/ui/`
13. Move `components/page/SectionThemedComponent.tsx`, `components/contexts/SectionThemeProvider.tsx` → `packages/puck-web/ui/`
14. Move `components/page/ParallaxRender.tsx` → `packages/puck-web/ui/`
15. Move `components/misc/PuckSectionThemeUpdater.tsx` → `apps/admin/components/`
16. Extract CSS theme variables from `globals.css` → `packages/puck-web/styles/theme.css`
17. Move `components/graphics/*` → `packages/graphics/src/`
18. `bun install` — verify workspace resolution works

### Phase 3: Create admin app
19. Create `apps/admin/app/layout.tsx` and `globals.css`
20. Move `app/admin/*` → `apps/admin/app/` (flatten — remove `/admin` prefix from routes)
21. Move `app/auth/*` → `apps/admin/app/auth/`
22. Move `app/login/*` → `apps/admin/app/login/`
23. Move admin components: `components/page/admin/*`, `components/page/security/*`, editors → `apps/admin/components/`
24. Move puck editor overrides: `components/puck-overrides/*` → `apps/admin/components/`
25. Move auth/security libs: `lib/auth/*`, `lib/security/*` → `apps/admin/lib/`
26. Move DB layer: `lib/db/*` → `apps/admin/lib/db/`
27. Move `lib/env.ts`, `lib/query-client.ts` → `apps/admin/lib/`
28. Move `components/Providers.tsx`, `components/security/*` → `apps/admin/components/`
29. Create `apps/admin/next.config.ts` and `postcss.config.js`
30. Update all imports: `@components/ui/*` → `@pfadipuck/puck-web/ui/*`, `@lib/*` → `@pfadipuck/puck-web/lib/*` or `@/lib/*`

### Phase 4: Create site app
31. Create `apps/site/app/layout.tsx` and `globals.css` — no auth, just QueryClient + ParallaxProvider
32. Move `app/[[...puckPath]]/page.tsx` → `apps/site/app/[[...puckPath]]/page.tsx`
33. Move site components: `PageRender.tsx`, `navbar/*Render*`, `Parallax*` → `apps/site/components/`
34. Create `apps/site/lib/db.ts` — thin read-only MongoDB access (3 functions)
35. Create `apps/site/lib/fonts.ts` — font loaders pointing at package assets
36. Create `apps/site/components/Providers.tsx` — QueryClientProvider + ParallaxProvider (no auth, no toasts)
37. Create `apps/site/next.config.ts` and `postcss.config.js`
38. Update all imports

### Phase 5: Validate and clean up
39. `turbo build` — both apps must compile
40. `turbo dev` — both apps must start and function
41. `turbo lint` — fix import issues
42. `turbo test` — run vitest
43. Test Storybook
44. Delete old root `app/`, `components/`, `lib/` directories
45. Update Docker setup with per-app Dockerfiles
46. Update `docker-compose.yml` for multi-app dev
47. Update CI/CD if applicable

---

## Key Decisions & Tradeoffs

### Why not a `packages/shared` catch-all?

The original plan had a big `packages/shared` package containing auth, db, security, env, configs, providers, etc. But with the new model where the site has zero auth:

- Auth, security, permissions, server guards → **only admin uses them**, so they live in `apps/admin/lib/`
- DB with write support and permission checks → **only admin**, stays in `apps/admin/lib/db/`
- Site gets its own 20-line `lib/db.ts` with just read queries
- Puck configs + components + UI primitives + theme CSS → `packages/puck-web` (both apps need them)
- `cn.ts` → `packages/puck-web/lib/` (puck components use it, admin also imports from there)

No need for a `packages/shared` or `packages/ui`. Every piece of code has a clear owner.

### Phased admin UI approach

The current UI components (Button, Dialog, Table, Input, Card, ErrorLabel) are
custom-styled using the site's theme tokens (`bg-primary`, `bg-elevated`,
`font-rockingsoda`, etc.). They use radix-ui for Dialog but are otherwise hand-rolled.
They live in `packages/puck-web/ui/` because both admin and puck editor overrides use them.
Toast lives in `apps/admin/components/ui/` since only admin uses toast notifications.

**Phase 1 (this migration):** Keep the current UI components as-is. Admin imports them
from `@pfadipuck/puck-web/ui/*`. Everything works with the site theme.

**Phase 2 (future):** Build a new admin UI with shadcn. Install shadcn in `apps/admin`,
generate components into `apps/admin/components/ui/`, and migrate admin pages to use
them. The puck-web UI components remain untouched — they continue to be used by puck
editor overrides and the site. Admin components gradually switch from
`@pfadipuck/puck-web/ui/Button` to `@/components/ui/Button`.

### Why site still needs `@measured/puck`

The site uses `<Render config={pageConfig} data={pageData} />` from Puck. The `config` defines which React components map to which Puck component names. Without it, the site can't render the JSON data from MongoDB. This is a runtime dependency, not just a type dependency.

The overhead is negligible — Puck's `<Render>` is a thin component mapper that walks the
JSON data and renders the matching React component for each entry. The editor UI (drag-and-drop,
sidebar, field editors) is tree-shaken away since nothing imports it. The remaining render
code is trivial compared to the actual page components being rendered.

### Why separate Dockerfiles matter

With the monorepo split, the site Docker image contains zero admin code, zero auth libraries, zero security logic. This means:
- Smaller image size
- Smaller attack surface (site has no auth endpoints to exploit)
- Independent scaling (site gets more traffic, admin is internal)
- Independent deploys (update admin without touching site)

### Port convention
- **Site**: `localhost:3000` — the public-facing app, default port
- **Admin**: `localhost:3001` — internal tool, secondary port

### `INTERNAL_API_BASE_URL` — remove it

This env var is validated in `lib/env.ts` and set in the CI workflow, but **no code
actually reads it**. It's a dead variable. During migration, remove it from `env.ts`
validation, `.env.example`, and the CI workflow.

---

## Test Migration

| Current File | Tests | Destination |
|---|---|---|
| `testing/section-theming.test.node.tsx` | `applySectionTheming()` theme alternation | `packages/puck-web/testing/section-theming.test.node.tsx` |
| `testing/puck/Text.test.browser.tsx` | Text Puck component rendering | `packages/puck-web/testing/puck/Text.test.browser.tsx` |

Both tests exercise shared puck-web code (section theming logic and Puck component
rendering), so they belong in `packages/puck-web/`.

Each package gets its own `vitest.config.ts` with the same dual-environment setup
(node + browser projects). The root `turbo.json` already defines a `test` task, so
`turbo test` will run all package tests in dependency order.

---

## Storybook Migration

Current stories exist in two locations with some duplication:

| Current File | Component | Destination |
|---|---|---|
| `components/ui/Button.stories.ts` | Button | `packages/puck-web/ui/Button.stories.ts` |
| `components/ui/Card.stories.tsx` | Card | `packages/puck-web/ui/Card.stories.tsx` |
| `components/ui/Dialog.stories.tsx` | Dialog | `packages/puck-web/ui/Dialog.stories.tsx` |
| `components/ui/ErrorLabel.stories.ts` | ErrorLabel | `packages/puck-web/ui/ErrorLabel.stories.ts` |
| `components/ui/Input.stories.ts` | Input | `packages/puck-web/ui/Input.stories.ts` |
| `components/ui/Table.stories.tsx` | Table | `packages/puck-web/ui/Table.stories.tsx` |
| `components/ui/Toast.stories.tsx` | Toast | `apps/admin/components/ui/Toast.stories.tsx` |
| `stories/Button.stories.ts` | Button (duplicate) | **Delete** |
| `stories/Input.stories.ts` | Input (duplicate) | **Delete** |

Stories co-locate with their components. The duplicates in `/stories/` are deleted.
Toast's story moves to admin alongside the component.

Storybook config stays at the monorepo root, scanning across packages:

```typescript
stories: [
  "../packages/puck-web/**/*.stories.@(ts|tsx)",
  "../apps/admin/components/**/*.stories.@(ts|tsx)",
]
```

---

## CI/CD Updates

Minimum changes needed — detailed workflow rewrite deferred to a later pass.

- **Build:** Change `next build` → `turbo build` (builds both apps + packages in dependency order)
- **Test:** Change `bun run test` → `turbo test`
- **Lint:** Change `eslint .` → `turbo lint`
- **Docker:** Split single `Dockerfile` into `apps/admin/Dockerfile` and `apps/site/Dockerfile`, both using `turbo prune` as described in the Docker Strategy section
- **Health check:** Update to check both apps (port 3000 for site, 3001 for admin)
- **Env vars:** Remove `INTERNAL_API_BASE_URL` from CI workflows. Site builds need only `MONGODB_CONNECTION_STRING` and `MONGODB_DB_NAME`

---

## How the Migration Will Be Worked

### Approach

All migration work happens on a single feature branch (`monorepo-migration`) off master.
Each phase (1–5) is committed as one or more atomic commits. The branch is not merged
until Phase 5 validates that both apps build, run, and pass tests.

### Progress Tracking

A progress doc (`MIGRATION_PROGRESS.md`) will be maintained at the repo root throughout
the migration. It tracks:

```markdown
# Migration Progress

## Phase 1: Turborepo Scaffolding
- [ ] Install turbo
- [ ] Create turbo.json
- [ ] Convert root package.json to workspace root
- [ ] Create packages/typescript-config
- [ ] Create packages/eslint-config
- [ ] Create package directories with package.json + tsconfig.json

## Phase 2: Extract packages/puck-web
- [ ] Move Puck components (Flex, Graphic, Heading, Hero, IFrame, SectionDivider, Text, VerticalSpace)
- [ ] Move navbar Puck components (NavbarDropdown, NavbarItem)
- [ ] Move Puck fields (upload-file)
- [ ] Move configs (page, navbar, footer)
- [ ] Move lib utilities (section-theming, custom-field-types, section-theme-context, cn)
- [ ] Move UI components (Button, Card, Dialog, Input, Table, ErrorLabel)
- [ ] Move misc UI (SectionBreak, StaticImage, ClickAwayListener, SectionThemedComponent, SectionThemeProvider, ParallaxRender)
- [ ] Extract theme CSS from globals.css
- [ ] Move graphics to packages/graphics
- [ ] Move tests to packages/puck-web/testing/
- [ ] Move stories to packages/puck-web/
- [ ] Verify: bun install resolves workspaces

## Phase 3: Create Admin App
- [ ] Create apps/admin layout + globals.css
- [ ] Move admin routes (flatten /admin prefix)
- [ ] Move auth routes + login page
- [ ] Move admin components (dashboard, security, editors)
- [ ] Move PuckSectionThemeUpdater to admin
- [ ] Move Toast to admin
- [ ] Move auth/security libs
- [ ] Move DB layer (full read/write)
- [ ] Move env.ts, query-client
- [ ] Move Providers.tsx
- [ ] Create admin next.config.ts + postcss.config.js
- [ ] Update all imports
- [ ] Remove INTERNAL_API_BASE_URL from env validation

## Phase 4: Create Site App
- [ ] Create apps/site layout + globals.css (QueryClient + ParallaxProvider, no auth)
- [ ] Move catch-all page route
- [ ] Move site rendering components (PageRender, navbar, Parallax)
- [ ] Create thin read-only db.ts with connection caching
- [ ] Create fonts.ts
- [ ] Create Providers.tsx (QueryClientProvider + ParallaxProvider)
- [ ] Create site next.config.ts + postcss.config.js
- [ ] Update all imports

## Phase 5: Validate and Clean Up
- [ ] turbo build — both apps compile
- [ ] turbo dev — both apps start and function
- [ ] turbo lint — no import errors
- [ ] turbo test — vitest passes
- [ ] Storybook works
- [ ] Delete old root app/, components/, lib/
- [ ] Update Dockerfiles (per-app with turbo prune)
- [ ] Update docker-compose.yml
- [ ] Update CI workflows (minimum: build, test, lint commands)
- [ ] Delete MIGRATION_PROGRESS.md
```

Each checkbox is ticked as the step is completed. This file is deleted at the end of
Phase 5 once the migration is verified and merged.

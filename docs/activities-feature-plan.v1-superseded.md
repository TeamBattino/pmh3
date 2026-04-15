# Activities Feature — Plan

Central admin resource for weekly group activities, surfaced on the public site via a Puck component. Each of the ~5 groups gets one activity doc that leaders edit and publish.

## Goals

- Leaders publish Saturday activity info per group (info / cancelled / custom message).
- Public site shows the current state per group, auto-falling back to "planning" when nothing is live.
- Admins configure groups and reusable locations; leaders don't manage those.

---

## Data model

### `groups`

One doc per scout group. Configurable in admin settings.

```
{
  _id,
  slug,            // stable URL-safe key, used in Puck component config
  name,            // display name, renameable without breaking refs
  color,           // brand color for UI
  sortOrder,
  leaderContact?,  // optional
}
```

Slug rationale: survives display-name changes, keeps Puck component configs and any group-scoped URLs stable.

### `locations`

Reusable meeting points. Managed by admins.

```
{
  _id,
  label,            // "Bahnhof Meilen"
  address,          // "Bahnhofstrasse 1, 8706 Meilen"
  mapsEmbedUrl?,    // iframe src copied from Google Maps "Share → Embed a map"
}
```

No coords, no geocoding, no API key. If `mapsEmbedUrl` is present we render an iframe; otherwise we show the address text with a link to `https://www.google.com/maps/search/?api=1&query=<address>`.

### `activities`

One doc per group. `groupSlug` is unique. Three independent content blocks coexist — editing or publishing one never wipes the others.

```
{
  _id,
  groupSlug,   // unique

  info: {
    date, startTime, endTime,
    startLocationId?, endLocationId?,
    customStart?: { label, address, mapsEmbedUrl? },   // one-off spots
    customEnd?:   { label, address, mapsEmbedUrl? },
    title,
    description,   // richtext
    bringList,     // richtext
  },
  cancelled: {
    message,       // plain text
    showUntil,     // datetime
  },
  custom: {
    title,         // richtext
    body,          // richtext
    showUntil,     // datetime
  },

  publishedType?: 'info' | 'cancelled' | 'custom',
  // absent = nothing published; site shows planning placeholder

  updatedAt, updatedBy,
}
```

### `activitySettings` (single doc)

```
{
  planningPlaceholder: {
    default: richtext,
    perGroup?: Record<groupSlug, richtext>,
  }
}
```

---

## State model

Two orthogonal concepts:

1. **Publish state** — binary. `publishedType` absent (or expired) → "planning" display. Present and unexpired → show that block.
2. **Published type** — `info` | `cancelled` | `custom`. Determines render + where expiry comes from.

### Expiry

| Type | Expires at |
|-|-|
| `info` | `endAt(info.date, info.endTime)` (implicit) |
| `cancelled` | `cancelled.showUntil` (explicit) |
| `custom` | `custom.showUntil` (explicit) |

Expiry is **render-only**. We never mutate `publishedType` in the background. The stored value is always the leader's last explicit decision; expiry just filters what's displayed.

### Render rule

```
effective = publishedType
if effective and expiryOf(effective) < now: effective = none

none       → planning placeholder (per-group override or default)
'info'     → activity card from info block
'cancelled'→ cancellation banner from cancelled block
'custom'   → custom block (title + body)
```

Implemented client-side in the Puck component so it re-evaluates without SSR cache invalidation. The server sends the doc + server time; the client decides what to render and re-checks on a timer for long-open pages.

---

## Leader flow

1. Open activity page in admin → select group.
2. Tab/segmented control picks type being edited: **Info / Cancelled / Custom**. Only selected type's editor is visible.
3. Top status strip shows ground truth:
   - *"Currently on site: Info (until Sat 17:00)"*
   - *"Currently on site: Planning — Info expired 2h ago"*
   - *"Currently on site: Planning — nothing published"*
4. **Save** persists edits to the currently-selected block. Does not touch `publishedType`.
5. **Publish** sets `publishedType` to the selected block. Blocked with inline error if that block's expiry is in the past.
6. **Revert to planning** (visible only when something is currently live): confirmation dialog → clears `publishedType`. Leader intent, not silent mutation.

Editing an already-published block updates the live render immediately — no republish needed. Republish is only for changing *which* block is live.

---

## Permissions

- `activity:edit` — all leaders. Edit any group's activity doc (save + publish + revert).
- `activity-admin:edit-settings` — admins only. Manage groups, locations, planning placeholder text.

User role shape: `leaderOfGroups: string[]` on the user, unused for v1 (all leaders edit all groups) but shaped for forward compat if we later scope per-group.

---

## Server actions

Matches existing `savePage`/`saveNavbar`/`saveFooter` pattern in `apps/admin`. One action per mutation. Permission check at the top of each.

- `saveActivity(groupSlug, patch)` — updates info/cancelled/custom blocks. Does not touch `publishedType`.
- `publishActivity(groupSlug, type)` — validates expiry is in future, sets `publishedType`.
- `revertActivityToPlanning(groupSlug)` — clears `publishedType`.
- `saveGroup(patch)` / `deleteGroup(slug)` — admin only.
- `saveLocation(patch)` / `deleteLocation(id)` — admin only.
- `saveActivitySettings(patch)` — admin only.

Reads go through normal server components (site) or admin loaders; no actions needed for fetch.

---

## Public site — Puck component

`<GroupActivityBoard>` — single component, always shows a group selector.

- Registered in the site's Puck config (not admin-only — it's a page component).
- Fields: `visibleGroupSlugs?: string[]` (default all in sortOrder).
- Always renders selector (no pre-pick). Remembers last-selected group in `localStorage`.
- Leaf state component is `"use client"` (selection, time-based re-render); outer config render stays server-side per CLAUDE.md rules.
- Server component fetches all activities + groups + locations + settings; client component handles selection + expiry check.

Renders per effective state:
- **Info:** title, date/time, start location (address + maps iframe if `mapsEmbedUrl`), end location if different, bring list, description.
- **Cancelled:** banner with `message`, visible until `showUntil`.
- **Custom:** title + body richtext.
- **Planning:** per-group placeholder if set, else default.

---

## Admin UI

### Routes (under `apps/admin`)

- `/activities` — group selector + activity editor (leaders)
- `/activities/settings` — groups + locations + planning placeholder (admins)

### Activity editor

- Group selector at top.
- Status strip (ground-truth display).
- Type tabs: Info / Cancelled / Custom.
- Per-tab editor:
  - **Info:** date picker, start/end time, location selectors (dropdown from `locations` + "custom" inline option), title, description (richtext), bring list (richtext).
  - **Cancelled:** plain-text message, `showUntil` datetime.
  - **Custom:** richtext title, richtext body, `showUntil` datetime.
- Actions: Save, Publish, Revert to planning (conditional).

### Settings

- Groups: CRUD list (name, slug, color, sortOrder, leaderContact).
- Locations: CRUD list (label, address, mapsEmbedUrl).
- Planning placeholder: default richtext + per-group overrides.

---

## Deferred / out of scope (v1)

- Images per activity.
- ICS export per group.
- Push/email notifications on publish.
- Per-group leader scoping (schema shaped for it; enforcement deferred).
- Recurring activity templates / "copy to next Saturday" button.
- Activity history / archive (current model is mutable, no history kept).
- RSVP / attendance tracking.
- Audit log of publish/revert actions (beyond `updatedAt`/`updatedBy`).

---

## Open questions to revisit post-demo

- Should leaders be scoped to their own group(s)?
- Do we want a "copy to next Saturday" button once leaders find date-bumping tedious?
- Does past-activity history become useful (reports, insurance, continuity)?
- Multi-day activities (weekend camps) — current schema handles via `date` + times, but UI needs a date-range mode.

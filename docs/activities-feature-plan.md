# Activities Feature — Plan

UX/functionality spec for the admin Activities feature and the public `<GroupActivityBoard>` Puck component.

**Scope of this doc.** This is a finalized UX and behavior specification. The data/schema/server layer is intentionally *not* specified — the implementing agent should design storage, server actions, and cache invalidation based on existing patterns in `apps/admin` (see `savePage` / `saveNavbar` / `saveFooter`) while respecting the behavioral contracts defined below.

**Key behavioral contracts the data layer must uphold:**

- Three block drafts (Info / Cancelled / Custom) + a live snapshot of the currently-published type coexist on one activity doc per group.
- Autosave targets drafts only; Publish snapshots the selected tab's draft into the live slot.
- `publishedType` is the only thing that can be cleared by Unpublish (S6). Drafts are never wiped by any publish/unpublish/expiry action.
- Expiry is render-only; no background mutations.
- Groups and locations are referenced by UUID; referential integrity is enforced at delete time.

Context: central admin resource for weekly group activities. ~5 scout groups. Each group has one activity doc that leaders edit and publish. Public site surfaces current state per group via a Puck component.

---

## Concepts

- **Groups**: ~5 scout groups, configured by admins. No per-leader scoping — any leader can edit any group.
- **Content types** per group: **Info**, **Cancelled**, **Custom**. All three coexist on a single doc; editing or publishing one never wipes the others.
- **Publish state**: at most one of the three is live at a time. Absent or expired → site shows a "planning" placeholder.
- **Expiry**:
  - Info expires at the activity's end datetime (implicit).
  - Cancelled / Custom expire at an explicit `showUntil`.
  - Expiry is render-only — we never mutate stored state in the background.

---

## Leader flow — confirmed scenarios

### Scenario 1: Publishing info for this Saturday

1. Leader opens `/activities` in admin → sees a **list of groups** (no default selection, always picks).
2. Picks a group → lands on that group's editor.
3. Status strip at top shows ground truth, e.g. *"Currently on site: Planning — nothing published"*.
4. Info tab is selected by default. Fields:
   - Date — with a **"Set next Saturday"** convenience button that fills in the upcoming Saturday.
   - Start time / end time.
   - Start location — dropdown of configured locations, plus a "custom" inline option for one-offs.
   - End location — same picker. **Leaving it blank means "same as start"**; the public site renders a single location block, not an empty second block.
   - Title, description (richtext), bring list (richtext).
5. **Autosave** on every field change — no manual Save button. A subtle "saved" indicator confirms.
6. **Publish** button promotes Info to live. Blocked with inline error if the end datetime is in the past.
7. Status strip updates to e.g. *"Currently on site: Info (until Sat 17:00)"*.

---

### Scenario 2: Cancelling an already-published info session

Friday evening, Info is live for Saturday. Leader decides to cancel.

1. Leader opens `/activities` → picks group → switches to **Cancelled** tab.
2. Cancelled block is empty. Fields:
   - Message — **plain text**.
   - `showUntil` — **defaults to tomorrow 23:59** when the tab is opened empty. Leader can override.
3. Autosave as they type.
4. **Publish** → because Info is currently live, a confirmation dialog appears: *"This will replace the live Info block with the cancellation. Continue?"* Leader confirms.
5. `publishedType` flips to `cancelled`. Info block stays intact in storage — re-publishing Info later brings it back untouched.
6. Status strip: *"Currently on site: Cancelled (until Sat 23:59)"*.

**Publish-confirmation rule (general):** whenever Publish would replace a different currently-live block, show a confirmation dialog. Publishing when nothing is live, or re-publishing the same type, does not need confirmation.

### Scenario 3: Info silently expires

Saturday 17:00 passes. Nothing in the background mutates state — expiry is render-only. The public site stops showing the Info card and switches to the planning placeholder as soon as the client timer re-evaluates.

1. Sunday morning, leader opens `/activities` → picks group.
2. Status strip: *"Currently on site: Planning — Info expired yesterday 17:00"*. No extra banner, no auto-focus, no auto-date-bump — the strip line is the only signal.
3. Info tab still shows last week's fields fully populated. Nothing is wiped on expiry. Leader edits date (often via "Set next Saturday"), tweaks bring list etc., then Publishes.
4. No confirmation dialog on Publish — nothing is currently live (expired ≠ live).

### Scenario 4: Editing a currently-live Info block — draft vs. live

Friday 21:00. Info is live for Saturday. Leader wants to add "Znüni mitbringen" to the bring list.

**Model**

- All three blocks (Info / Cancelled / Custom) always exist as autosaved drafts. Leaders can freely edit any tab — editing never affects the public site by itself.
- At most one block is **live** (i.e. reflected on the public site), determined by `publishedType`. The live content is a **snapshot** taken at Publish time, independent from the draft afterwards.
- There is no discard action. Drafts are simply the current editing state; when ready, the leader clicks Publish on the tab they want live, and that tab's current draft is snapshotted as the new live version.

**Flow**

1. Leader opens `/activities` → picks group → Info tab (currently the live type).
2. Editor shows the Info draft.
3. Leader edits bring list. Autosave persists the draft. Public site still shows the previous live snapshot.
4. A single global indicator shows *"Unpublished changes — click Publish to update the site"* when the currently-live type's draft differs from its live snapshot. (No per-tab indicators — only one type is ever live, so only one draft-vs-live comparison is meaningful at a time.)
5. Leader clicks **Publish Info**. The current Info draft is snapshotted as live. Indicator clears. Status strip: *"Currently on site: Info (until Sat 17:00)"*.

**Publish button semantics**

- The Publish button always publishes *the currently selected tab*, turning its draft into the new live snapshot and setting `publishedType` accordingly.
- If the selected tab is already `publishedType` and its draft == live → button is idle/disabled (nothing to publish).
- If the selected tab is already `publishedType` and its draft ≠ live → button is active; no confirmation (same type, just an update).
- If the selected tab is a different type than `publishedType` → confirmation dialog (per S2 rule) before replacing the live block.

### Scenario 5: Publishing a Custom message

Example use: *"Nächsten Samstag kein Programm — wir sehen uns in zwei Wochen zum Höck."*

1. Leader opens `/activities` → picks group → **Custom** tab.
2. Fields:
   - Title — **plain text**.
   - Body — richtext.
   - `showUntil` — datetime, **defaults to tomorrow 23:59** when opened empty (same rule as Cancelled).
3. Autosave writes to Custom draft.
4. **Publish Custom** → confirmation dialog only if a different type is currently live (per S2 rule).
5. Status strip: *"Currently on site: Custom (until …)"*.

**Expiry is always respected.** A `showUntil` in the past makes the Publish button blocked with inline error — no "always live" mode. Expiry drives auto-fallback to planning on the public site.

### Scenario 6: Unpublish — return to planning placeholder

Use case: Info is live but the leader realises the plan is wrong and wants the site back to neutral "planning" without announcing a cancellation.

1. **Unpublish** button is shown near the status strip as a secondary action (not next to Publish). Only visible when something is *actively* live (expired-but-still-stored does not count — the site already shows planning in that state, so the button would be a no-op).
2. Click → confirmation dialog *"This will remove [Info/Cancelled/Custom] from the site and show the planning placeholder. Continue?"*
3. On confirm → `publishedType` cleared. All three block drafts remain untouched.
4. Status strip: *"Currently on site: Planning — nothing published"*.

### Scenario 7: Concurrent edits by two leaders

- Different blocks or different fields → autosaves target different paths, both survive.
- Same field → **last write wins**, silently. No locking, no collaborative presence indicators, no merge UI.
- Publish race → whoever clicks Publish last determines `publishedType`.
- No server staleness re-check on Publish: the confirmation dialog is built from the client's view of state and may occasionally be slightly out of date. Accepted tradeoff for a small team.

### Scenario 8: Public site — `<GroupActivityBoard>` Puck component

**`<GroupActivityBoard>` is bound to exactly one group**, picked in the Puck editor's component config (a group-selector field on the config panel). No runtime selector, no client-side group switching, no localStorage. A page that needs multiple groups stacks multiple instances.

Renders per effective state for its configured group:

- **Info**: title, formatted date + time range, start location (address + maps iframe if `mapsEmbedUrl`, else address text with link to `maps.google.com/...?query=<address>`), end location block only if different from start, bring list, description.
- **Cancelled**: banner using a neutral **alert palette** (not the group color) + message.
- **Custom**: title + body.
- **Planning**: per-group placeholder if set, else default.

**No client-side expiry timer.** The site shows whatever was effective at request time. Visitors get updated info by refreshing. Server rendering is straightforward; expiry is evaluated once per request against server time.

### Scenario 9: Admin settings (`/activities/settings`)

Gated by `activity-admin:edit-settings`. Leaders don't see this route.

**No autosave in settings** — these are infrequent, higher-stakes edits (references across Puck instances and activity docs). Use an explicit **Save** button per section, with a dirty indicator.

**Groups section**

- List of groups with editable fields: name, sortOrder, optional leaderContact.
- **No slug.** Groups are referenced by UUID everywhere (Puck component config, activity docs). UUID is stable across renames and needs no user-facing slug field.
- Add / edit via a form; save with explicit button.
- **Delete is blocked** if the group is referenced by any `<GroupActivityBoard>` Puck instance — error surfaces a list of pages using it. Admin must remove/reassign those instances first.

**Locations section**

- Label, address, optional `mapsEmbedUrl` (text input where admin pastes the iframe src from Google Maps "Share → Embed a map").
- **Delete is blocked** if any activity's Info block references the location. Error lists the groups still using it.

**Planning placeholder section**

- One richtext editor for the default.
- Collapsible per-group overrides list (one richtext per group, only populated when overriding).

---

## Open questions

- **Cache invalidation for the public site** — Publish / Unpublish need to invalidate cached pages rendering `<GroupActivityBoard>`. Either uncache those pages, or have the server actions call the appropriate revalidate hooks. Revisit when designing the data/server layer.

---

## Edge cases

### E1: Publish validation — required fields per block

Strict validation on Publish. Autosave is unaffected (drafts can be in any state; only Publish enforces completeness).

- **Info**: date, startTime, endTime, startLocation, title, description are required. bringList optional. endLocation optional (blank = same as start).
- **Cancelled**: message + `showUntil` required.
- **Custom**: title + body + `showUntil` required.

Cross-field rules:

- `endTime` must be after `startTime` (inline error on the time fields).
- `date` (Info) must not be in the past.
- `showUntil` (Cancelled, Custom) must be in the future.

Violations show inline field-level errors and keep the Publish button blocked until resolved.

### E2: `mapsEmbedUrl` input hygiene

The admin Location field accepts either a raw URL or a full `<iframe>` snippet (Google's Embed dialog gives the latter).

- On save, auto-extract the `src` attribute if a full iframe tag was pasted.
- Validate the resulting URL starts with `https://www.google.com/maps/embed`. Reject anything else with inline error *"Paste a Google Maps embed URL or the iframe snippet from Google Maps → Share → Embed a map."*
- Store only the extracted URL — never raw HTML.

### E3: Custom (one-off) location in Info

- Start Location and End Location each use a single combobox listing saved locations plus a pinned **"+ Custom location…"** entry.
- Picking "+ Custom" reveals inline fields below the combobox: label, address, optional `mapsEmbedUrl` (same hygiene rules as E2).
- Switching back to a saved entry clears the inline custom fields.
- A custom location is stored inline on that Info block only — never added to the reusable `locations` list. No "save this for reuse" convenience action in v1.

### E4: Editing a saved location after it's referenced

- Info blocks reference saved locations by UUID. Public render resolves the UUID at request time, so admin edits (address fix, maps URL update) propagate to every Info using it — including currently live ones.
- Custom (inline) locations are snapshot on the Info block by construction; edits elsewhere can't affect them.
- Deletion of a referenced saved location is blocked (per S9), so references never dangle.

### E5: Empty planning placeholder

Fallback chain when nothing is live: per-group override → default → built-in fallback.

- Built-in fallback text (e.g. *"Aktuell sind keine Informationen verfügbar."*) is baked into the component so the public site always renders something meaningful, even if admins have configured nothing.
- Settings page requires the default planning placeholder to be set — shows a prominent prompt / warning when empty, but does not hard-block saving other settings. Per-group overrides remain optional.

### E6: Time zones

- All datetimes stored as UTC ISO strings.
- All user-facing display (admin pickers, status strip, public site) is rendered in Europe/Zurich, regardless of the viewer's browser timezone — activities happen at Meilen local time, period.
- Admin date/time inputs operate in Europe/Zurich and convert to UTC on save.
- Expiry comparisons use UTC on both sides; no TZ logic at the comparison step.

### E7: Autosave behavior

- **Debounce**: 800 ms of no activity before firing a save.
- **Indicator states** near the editor: *"Saving…"* (in-flight), *"Saved"* (last save succeeded), *"Couldn't save — retrying"* (on failure).
- **Retry on network failure**: exponential backoff (roughly 2 s, 5 s, 15 s). Keep the draft in memory; never overwrite the user's unsaved edits with a refetch.
- **Navigation guard**: if a debounced save is pending or in-flight when the user navigates / closes the tab, trigger `beforeunload` with *"Changes may not be saved"* and flush the pending save if possible.
- **Rich text**: same debounce; skip saving during IME composition.
- **No save on mount**: a fresh form load that hasn't been edited doesn't fire an autosave. Only actual diffs from the server baseline trigger saves.

### E8: `/activities` landing — groups list

- Plain list of all groups in `sortOrder`. **Always shown**, even if only one group exists (no auto-navigate).
- Each row enriched with a status summary: *"Pfader — Info live (Sat 14:00–17:00)"*, *"Wölfli — Planning — Info expired yesterday"*, *"Biber — Cancelled (until Sat 23:59)"*, etc. Lets leaders see at a glance which groups need attention before clicking.
- Clicking a row navigates to a **per-group URL** (`/activities/<uuid>`) so leaders can bookmark / share direct links and the browser back-button works naturally.
- No "resume where you left off" shortcut — the list itself is the landing.

### E9: Delete-blocked error UX

When deleting a group or location is blocked by a reference:

- Error dialog lists every offending reference as a **clickable link** that navigates to the relevant admin editor (Puck page editor for group references, the per-group activity editor for location references).
- **Drafts count as references** — even an unpublished Info draft pointing at a saved location blocks its deletion. No silent reference-stripping.
- **Group cascade**: once a group has no remaining references, deleting it also deletes its activity doc (all three block drafts). No archive concept in v1.

---

## Permissions

- `activity:edit` — leaders. Can edit any group's activity doc (autosave drafts, Publish, Unpublish). No per-leader group scoping in v1.
- `activity-admin:edit-settings` — admins only. Manage groups, reusable locations, planning placeholder.

---

## Deferred / out of scope for v1

- Images per activity.
- ICS / calendar export per group.
- Push or email notifications on publish.
- Recurring activity templates / "copy last week" button (the "Set next Saturday" date shortcut is the only convenience in v1).
- Activity history / archive (model is mutable; drafts are the only state kept).
- RSVP / attendance tracking.
- Audit log beyond `updatedAt` / `updatedBy`.
- Multi-day activities (weekend camps): no first-class support. Guidance for leaders: use Custom for now.
- Richtext extension selection for description / bringList / Custom body / planning placeholder: the implementing agent should follow existing Puck richtext field conventions in this repo.
- Preview of `<GroupActivityBoard>` rendering from inside the admin editor (leaders can check the live site post-publish).

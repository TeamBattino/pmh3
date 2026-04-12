# CMS File System — Decisions Log

Deviations from `cms-file-system-plan.md` and rationale. Append-only.

## Format
`YYYY-MM-DD` — `<decision>` — `<why>`

## Entries

- **2026-04-11** — Documents route uses a single `/documents` page rather than the plan's `/documents/[[...folderPath]]` catch-all — Folder state lives in component state with tree-driven selection; adding catch-all URL routing is mostly plumbing with no functional benefit in v1, so deferred until users need deep-linking.
- **2026-04-11** — S3 public URL base is exposed to the client via a `<meta name="pfadipuck-s3-public-url-base">` tag in the root layout instead of a `NEXT_PUBLIC_*` variable — Only needed by a handful of client components, and the read URL is public by definition. Avoids restructuring the t3 env block.
- **2026-04-11** — `Leiter` role gains full `asset:*` suite; `JungLeiter` gains `asset:read` — Plan only added `asset:read`. The existing `asset:create/update/delete` slots weren't assigned to any role, so nobody could actually use them. Leiter is the closest existing match to a content editor.
- **2026-04-11** — `RemoveFromAlbumDialog` implemented as an inline action with a `sonner` toast on blocked last-album removal, instead of a separate dialog. The server action already returns structured `{ removed, blocked }`, so a toast covers the UX requirement without a second modal. Reworking into a dedicated dialog is a trivial follow-up if editors trip over it.
- **2026-04-11** — Media landing's CMS Uploads tile routes to `/media/_uploads/{albumId}` with `_uploads` as a sentinel `collectionId` — the system album has no parent album collection, so we dedicate a sentinel segment rather than inventing a second page shell. `AlbumView` unwraps `_uploads` back to `null`.
- **2026-04-11** — Local MinIO published on `localhost:9100` (API) and `:9101` (console) — MinIO's default is 9000, which `mock-oidc` already owns. The internal container port stays 9000, so `S3_ENDPOINT` in e2e points at `http://minio:9000` and in dev at `http://localhost:9100`. MinIO data lives in `./data-minio` (sibling of `./data` to keep mongo's bind mount clean; both are gitignored).
- **2026-04-11** — Dev bucket uses `mc anonymous set download` for public GET instead of presigned URLs on reads — matches the "build URLs at render time" strategy from the plan (`<img src={publicUrl + s3Key}>`) and avoids an N+1 round trip per image render on the public site. PUTs still require presigned URLs minted by the admin.
- **2026-04-12** — Reverted the above: all reads go through presigned GET URLs (7-day TTL) instead of public bucket access. Production S3 bucket on Railway can't be made public; rather than proxying bytes through Next.js (doubles egress) or switching providers, we mint presigned read URLs server-side. `FileRecord` is enriched with `signedUrl` / `signedThumbSmUrl` / `signedThumbMdUrl` in `enrichFileRecord` before crossing any server-action boundary, so client components render from these fields directly — no bucket host on the client, no meta tag, no `S3_PUBLIC_URL_BASE` env var. Dev bucket no longer needs `anonymous set download` either.

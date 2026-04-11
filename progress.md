# CMS File System — Progress

Tracks implementation against `cms-file-system-plan.md` (sections 1–17).

**Status: v1 implementation complete.** All plan steps 1–15 done. See
`decisions.md` for deviations and their rationale.

## Status legend
- [ ] todo
- [~] in progress
- [x] done
- [!] blocked / deferred

## Checklist (mirrors plan section 14)

### 1. Env + S3 client
- [x] Add S3 env vars to `apps/admin/lib/env.ts` and `.env.example`
- [x] Implement `apps/admin/lib/storage/s3.ts` (presignPut / headObject / publicUrl / deleteObjects)
- [x] Add admin deps: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `@tanstack/react-virtual`, `blurhash`, `browser-image-compression`

### 2. Mongo schemas + DatabaseService methods
- [x] Type file `apps/admin/lib/db/file-system-types.ts`
- [x] Extend `DatabaseService` interface in `db.ts`
- [x] Implement methods on `MongoService` (`db-mongo-impl.ts`)
- [x] Add indexes + seed system containers in `db-bootstrap.ts`
- [x] `findFileReferencesInPuckData` (scan puck-data)
- [x] Add `asset:read` permission (+ roles updated)

### 3. Server actions
- [x] `apps/admin/lib/db/file-system-actions.ts` — all actions gated by `requireServerPermission`

### 4. React Query hooks
- [x] `apps/admin/lib/files/file-system-hooks.ts`

### 5. Client upload pipeline
- [x] `client-upload.ts` (classification + variants + blurhash)
- [x] `xhr-put.ts` (XHR PUT w/ progress)
- [x] `useFileUpload.ts`
- [x] Split `classify.ts` as pure unit-testable module

### 6. Background ops
- [x] `BackgroundOpsProvider` + `BackgroundOpsDock`
- [x] Wired into root `Providers.tsx` (covers every route group)

### 7. Ring 1 primitives
- [x] FileCard (blurhash placeholder + lazy img, kind icons for non-images)
- [x] FileGrid (row-virtualized via @tanstack/react-virtual)
- [x] FileList
- [x] FileUploadZone (drop + click, bar/button appearances)
- [x] FileDetailSheet (metadata, alt-text, references, delete-blocked dialog)
- [x] DeleteBlockedDialog
- [x] `thumb-url.ts` + `format.ts` helpers

### 8. Documents section
- [x] FolderTree, FolderBreadcrumb, NewFolderButton, MoveToFolderDialog
- [x] DocumentsPage shell
- [x] `(dashboard)/documents/page.tsx` (single page; nested path routing deferred, tree drives selection)

### 9. Media section
- [x] MediaLanding (replaces CollectionBrowser — merged)
- [x] CollectionCard, AlbumCard, NewCollectionButton
- [x] AddToAlbumDialog (RemoveFromAlbumDialog inlined as toast-confirming action — see decisions)
- [x] CollectionView + AlbumView
- [x] `(dashboard)/media` pages (landing / [collectionId] / [collectionId]/[albumId])

### 10. Picker context + modal
- [x] FilePickerProvider, FilePickerModal (usePickerSelection folded into modal state)

### 11. Puck fields
- [x] mediaField, documentField (inline SVGs so puck-web doesn't take a new dep)
- [x] file-picker-context (renamed to `.tsx` to match puck-web exports)
- [x] resolve-file-refs.ts

### 12. Delete protection
- [x] `findFileReferencesInPuckData` wired into `deleteFile` + `bulkDeleteFiles`
- [x] `DeleteBlockedDialog`

### 13. Replace file
- [x] `replaceFile` server action + kind-match guard
- [x] `useFileReplace` hook routed through background ops dock
- [x] Wired into `FileDetailSheet`

### 14. Sidebar entries + asset:read role wiring
- [x] Media + Documents entries in `AppSidebar.tsx`
- [x] `Leiter` gets full asset suite, `JungLeiter` gets `asset:read`

### 15. Orphan GC manual button
- [x] `findOrphanFiles` on DB + `previewOrphanGc` / `runOrphanGc` server actions
- [x] `OrphanGcCard` on `/media` landing behind `asset:delete` guard
- [x] Integration test for orphan detection

### 16. Dev environment (MinIO)
- [x] `docker-compose.yml`: `minio` service on ports 9100 (API) / 9101 (console), plus `minio-init` one-shot that creates `pfadimh-files` and sets anonymous download
- [x] `docker-compose.e2e.yml`: same MinIO pair, no published ports, tmpfs volume, `service_completed_successfully` gate on admin/site
- [x] `.gitignore`: `/data-minio`
- [x] `.env` + `.env.example`: `S3_ENDPOINT=http://localhost:9100`, etc.
- [x] Admin `env.ts`: S3 vars added to the t3 env block
- [x] Site receives `S3_PUBLIC_URL_BASE` via raw `process.env` (no env validation)

## Tests
- [x] Integration tests for MongoService file system methods (12 file-system tests + orphan GC test = 16 total integration tests passing)
- [x] Unit tests for client-upload classifier (9 classify tests passing)

## Build status
- [x] `bun run type-check` clean across the monorepo
- [x] `bun run test:unit` 17/17 passing (admin) + 1/1 puck-web
- [x] `bun run test:integration` 16/16 passing
- [x] `bun run build` admin next build completes with all new routes present
- [x] `docker compose up minio minio-init` provisions the `pfadimh-files` bucket and sets anonymous download; smoke test (presign → PUT → HEAD → anon GET → delete) passes end-to-end against local MinIO
- [x] `docker compose config` clean for both dev and e2e compose files

## Deferred / out of scope for v1
- Migration of existing `uploadFileField` base64 images to the new system
- `uploadedBy` attribution (awaits Keycloak migration)
- Bucket-side orphan detection (ListObjectsV2 sweep)
- Drag-reorder inside albums/folders
- Captions on `collection_files`
- Embedded PDF preview in detail sheet
- Video thumbnail generation
- Automated GC cron
- `/documents/[...folderPath]` catch-all URL routing — currently folder is component state
- Prev/next arrows in detail sheet (plan explicitly excludes)

## Notes
- All image processing stays client-side; server never touches file bytes.
- `uploadedBy` is always `null` in v1 — renders as "Someone".
- System CMS Uploads containers are seeded on first read (idempotent).
- FilePickerProvider wrapped at `app/(editor)/layout.tsx` so Puck fields can
  call `openPicker()` from any editor route.
- S3 public URL base is exposed to the client via a `<meta>` tag in the root
  layout instead of a `NEXT_PUBLIC_*` variable (see decisions.md).

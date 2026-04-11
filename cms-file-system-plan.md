# CMS File System — Implementation Plan

Codebase-specific implementation plan for a CMS file system in the pfadipuck Turborepo. Tailored after a full UX walkthrough; every section reflects locked decisions.

---

## 0. Core decisions (locked)

### Data model: two disjoint pools

| | **Documents pool** | **Media pool** |
|---|---|---|
| Mental model | Filesystem (1:1 file-to-folder) | Album membership (file belongs to ≥1 albums) |
| Container schema | `folders` collection, max depth 2 (levels 0–2) | `collections` collection: album collections (top-level) and albums (children) |
| File-to-container relationship | `files.folderId` stored directly on the file record | `collection_files` join table, many-to-many |
| Default container for quick-uploads | `CMS Uploads` system folder | `CMS Uploads` system album |
| Cross-pool operations | **None.** Files never cross between pools. |

**Invariants:**
- A file's pool is determined at upload time and never changes.
- Documents files always have a non-null `folderId`. Media files always have `folderId: null` and **≥1 `collection_files` rows** (minimum of one enforced at the API layer).
- Media files can be members of multiple albums simultaneously. Removing a file from its last album is blocked — editors Delete instead.
- The two CMS Uploads containers are wholly independent — they share a name and behavior, not data.

### Storage

- **S3-compatible bucket on Railway.** `@aws-sdk/client-s3` with a custom `endpoint` and `forcePathStyle: true`. App deploys to Railway.
- **No caps on upload size.** Users can upload 100 MB photos.
- **All image processing client-side.** No `sharp`, no server CPU, no job queue.
- **Variants per image:** `original` (uncapped), `_thumb_sm` (200 px WebP), `_thumb_md` (800 px WebP), plus a `blurhash` string in Mongo. No `_thumb_lg` — the original serves on the public site.
- **Non-image handling:**
  - **SVG** and **animated GIF** pass through untouched, no thumbnails, no blurhash.
  - **Video** uploads untouched, no thumbnail, generic icon in picker, `<video>` on the site.
  - **Documents** (PDF/Word/ZIP/etc.) upload as-is, generic icon, "Open in new tab" / download on the site.
- **Image serving:** plain `<img src={publicUrl} loading="lazy" />`. Blurhash as placeholder until load.

### Permissions

Reuses the existing `asset:*` slots in `apps/admin/lib/security/security-config.ts:1`:

- `asset:create` — upload (presign + confirm)
- `asset:update` — move, rename, update alt text, replace, manage containers
- `asset:delete` — delete files, folders, collections, albums
- `asset:read` — **new slot to add** — picker access, listing, detail view

### Auth / user attribution

- `files.uploadedBy` is stored as `null` for v1 with a `// TODO: populate after Keycloak migration` comment on the schema.
- UI renders "Someone" wherever an uploader would be shown.

### Component reference tracking

- **No `component_files` collection.** The original brief's idea of a dedicated reference index is dropped.
- Reference lookup happens at **delete time** and at **detail-sheet open time** by scanning `puck-data`. The Puck `Data` blob is walked in JavaScript; every `fileId` substring found in a component prop is collected with its `{ pageId, componentId, propPath }`.
- For a small CMS this is fast enough. If it becomes slow, add a materialized index later with zero API changes.

### Live-only, no snapshot mode

- `FileRef` does not have a `mode: 'live' | 'snapshot'` field.
- `collection` refs always resolve to the current membership of the album.

### Migration of existing base64 images

- Out of scope for v1. The existing `uploadFileField` at `packages/puck-web/fields/upload-file.tsx` keeps working alongside the new fields. Hero `backgroundImage` and navbar logo continue to use base64 dataURLs until a later migration pass.

---

## 1. New env vars

Added to `apps/admin/lib/env.ts` and the root `.env`:

```
S3_ENDPOINT=                # e.g. https://bucket-production-xxxx.up.railway.app
S3_BUCKET=                  # bucket name
S3_REGION=auto              # arbitrary string for MinIO-compatible backends
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_URL_BASE=         # read URL prefix, e.g. https://files.pfadi-mh.ch
```

Absolute public URLs are computed at render time from `S3_PUBLIC_URL_BASE + s3Key`. `apps/site` only needs `S3_PUBLIC_URL_BASE`; it never writes to S3.

CORS on the Railway bucket must accept:
- `PUT` from the admin origin (presigned uploads)
- `GET` from any origin (public site + picker previews)

---

## 2. Storage client

`apps/admin/lib/storage/s3.ts`

Exports:
- `s3Client` — an `S3Client` configured with the env vars above
- `presignPut(key, contentType, expiresSeconds): Promise<string>` — returns a presigned PUT URL
- `headObject(key): Promise<boolean>` — existence check for upload confirmation
- `publicUrl(key): string` — `S3_PUBLIC_URL_BASE + '/' + key`
- `deleteObjects(keys: string[]): Promise<void>` — batch delete, used on file delete and replace

The server **never** touches file bytes — no streaming, no proxying. Uploads go directly from browser to bucket via presigned URLs.

---

## 3. Mongo data model

### 3.1 Collections

Added alongside the existing `puck-data` / `security` collections. Naming matches existing lowercase conventions:

- `files`
- `folders`
- `collections`
- `collection_files`

**No `folder_files` collection.** The 1:1 Documents relationship is enforced by putting `folderId` directly on the `files` record.

**No `component_files` collection.** Reference tracking scans `puck-data` on demand.

### 3.2 `files`

```ts
{
  _id: ObjectId,
  uuid: string,                    // also used as S3 key prefix
  kind: 'image' | 'video' | 'document',

  // Pool membership — exactly one of folderId or collection_files row
  folderId: ObjectId | null,       // non-null ↔ Documents pool

  originalFilename: string,        // editable
  altText: string | null,          // images only
  mimeType: string,
  sizeBytes: number,

  s3Key: string,                   // {uuid}.{ext}
  thumbSmKey: string | null,       // {uuid}_thumb_sm.webp (null for svg/gif/video/doc)
  thumbMdKey: string | null,
  width: number | null,
  height: number | null,
  blurhash: string | null,

  uploadedAt: Date,
  uploadedBy: null,                // TODO: populate after Keycloak migration
}
```

### 3.3 `folders` (Documents pool)

```ts
{
  _id: ObjectId,
  name: string,
  slug: string,
  parentId: ObjectId | null,       // null = root level
  ancestorIds: ObjectId[],         // root → parent, used for descendant queries
  level: number,                   // 0 = root, max = 2
  sortOrder: number,
  isSystemFolder: boolean,         // true for "CMS Uploads"
  createdAt: Date,
}
```

**Rules:**
- Max depth is level 2 (three levels: 0, 1, 2). `createFolder()` rejects creation beyond level 2.
- `ancestorIds` is maintained on create and move.
- The `CMS Uploads` system folder is seeded on first service read with `isSystemFolder: true`, cannot be deleted or renamed.

### 3.4 `collections` (Media pool)

```ts
{
  _id: ObjectId,
  type: 'album_collection' | 'album',
  title: string,
  slug: string,
  description: string | null,
  year: number | null,             // schema retained, no UI in v1
  coverFileId: ObjectId | null,    // manually set; no auto-derivation
  parentId: ObjectId | null,       // null = top-level
  sortOrder: number,
  isSystemAlbum: boolean,          // true for Media "CMS Uploads"
  createdAt: Date,
}
```

**Rules:**
- `type: 'album_collection'` and `parentId: null` — a top-level Album Collection that contains albums (not files directly).
- `type: 'album'` and `parentId: <album_collection_id>` — an album inside a collection, contains files via `collection_files`.
- `type: 'album'` and `parentId: null` is **only valid for `isSystemAlbum: true`** — the CMS Uploads system album sits at the top level as a special case. Seeded on first service read.
- Only one level of nesting (album collection → album). Albums cannot contain sub-albums.
- `createCollection()` rejects attempts to create non-system top-level albums.
- `description`, `year`, and `coverFileId` are optional and have no dedicated UI in v1 (schema is kept so adding UI later requires no migration).

### 3.5 `collection_files`

```ts
{
  _id: ObjectId,
  collectionId: ObjectId,
  fileId: ObjectId,
  sortOrder: number,
  addedAt: Date,
}
```

**No unique constraint on `fileId`** — a Media file can be a member of multiple albums. The minimum-1-album invariant is enforced at the API layer (remove-file-from-album rejects the last removal). No `caption` field (dropped for v1 — trivial to add later).

### 3.6 Indexes

Added to `MongoService` constructor alongside the existing page-path index:

```
files.createIndex({ uuid: 1 }, { unique: true })
files.createIndex({ kind: 1 })
files.createIndex({ folderId: 1 })
files.createIndex({ originalFilename: "text" })

folders.createIndex({ parentId: 1, sortOrder: 1 })
folders.createIndex({ ancestorIds: 1 })
folders.createIndex({ slug: 1 }, { unique: true })
folders.createIndex({ isSystemFolder: 1 }, { partialFilterExpression: { isSystemFolder: true } })

collections.createIndex({ parentId: 1, sortOrder: 1 })
collections.createIndex({ slug: 1 }, { unique: true })
collections.createIndex({ isSystemAlbum: 1 }, { partialFilterExpression: { isSystemAlbum: true } })

collection_files.createIndex({ fileId: 1 })
collection_files.createIndex({ collectionId: 1, fileId: 1 }, { unique: true })  // prevents duplicate membership
collection_files.createIndex({ collectionId: 1, sortOrder: 1 })
```

---

## 4. `DatabaseService` extension

Add methods to the interface at `apps/admin/lib/db/db.ts:10` and implement in `db-mongo-impl.ts` and `db-mock-impl.ts`:

```ts
// Files
createFile(input: CreateFileInput): Promise<FileRecord>;
getFile(id: string): Promise<FileRecord | null>;
updateFile(id: string, patch: UpdateFilePatch): Promise<void>;     // name, altText
replaceFile(id: string, input: ReplaceFileInput): Promise<void>;   // new blob, same fileId
deleteFile(id: string): Promise<void>;                             // runs reference scan
searchFiles(q: { text?: string; kind?: FileKind; folderId?: string }): Promise<FileRecord[]>;

// Folders (Documents pool)
getFolderTree(): Promise<FolderRecord[]>;
createFolder(input: CreateFolderInput): Promise<FolderRecord>;     // enforces max level = 2
updateFolder(id: string, patch: UpdateFolderPatch): Promise<void>; // rename, move
deleteFolder(id: string): Promise<void>;                           // only if empty
listFolderFiles(folderId: string, page: { offset: number; limit: number }): Promise<FileRecord[]>;
moveFilesToFolder(fileIds: string[], targetFolderId: string): Promise<void>;

// Collections (Media pool)
getCollectionTree(): Promise<CollectionRecord[]>;
createCollection(input: CreateCollectionInput): Promise<CollectionRecord>;
updateCollection(id: string, patch: UpdateCollectionPatch): Promise<void>;
deleteCollection(id: string): Promise<void>;                       // only if empty, not system
listCollectionFiles(collectionId: string, page): Promise<FileRecord[]>;
addFilesToAlbum(fileIds: string[], targetAlbumId: string): Promise<void>;              // idempotent, skips duplicates
removeFilesFromAlbum(fileIds: string[], sourceAlbumId: string): Promise<{ removed: string[]; blocked: string[] }>; // blocks files whose only membership is this album

// Reference scanning
findFileReferencesInPuckData(fileId: string): Promise<Reference[]>;

// Ref resolution (used by apps/site)
resolveCollectionRef(collectionId: string): Promise<string[]>;     // returns fileIds
```

```ts
type Reference = {
  pageId: string;      // the page path
  componentId: string; // stable Puck component id
  propPath: string;    // e.g. "backgroundImage"
};
```

All public UI access goes through **server actions** in `apps/admin/lib/db/file-system-actions.ts` (new file, mirrors the existing `db-actions.ts` pattern), each wrapped with `requireServerPermission({ all: ['asset:...'] })` from `apps/admin/lib/security/server-guard.ts:7`. Direct `dbService` access is reserved for trusted server contexts, per the existing convention documented at `apps/admin/lib/db/db.ts:46`.

No REST API routes are introduced — see section 6.

### System container seeding

`MongoService` seeds both CMS Uploads containers on first read:

- `folders`: insert a document with `name: 'CMS Uploads'`, `parentId: null`, `level: 0`, `isSystemFolder: true` if none exists.
- `collections`: insert a document with `type: 'album'`, `title: 'CMS Uploads'`, `parentId: null`, `isSystemAlbum: true` if none exists.

Both are idempotent; seeding is triggered by `getFolderTree()` and `getCollectionTree()`.

---

## 5. Upload pipeline (all client-side)

### 5.1 New dependencies

Added to `apps/admin/package.json`:

- `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` (server)
- `browser-image-compression` (client) — canvas-based resize
- `blurhash` (client) — encode from ImageData
- `@tanstack/react-virtual` (client) — virtual grid/list in file views and picker

### 5.2 Classification

Implemented in `apps/admin/lib/files/client-upload.ts`. Classifies each file based on MIME type:

```
image/svg+xml                 → kind: 'image', variants: []                      (passthrough)
image/gif + isAnimated        → kind: 'image', variants: []                      (passthrough)
image/* (other)               → kind: 'image', variants: ['original', 'sm', 'md']
video/*                       → kind: 'video', variants: ['original']
everything else               → kind: 'document', variants: ['original']
```

GIF animation detection: inspect the first few bytes of the blob with `FileReader.readAsArrayBuffer` and check for the `NETSCAPE2.0` extension block. Fallback: treat all GIFs as passthrough.

### 5.3 Variant generation (images only)

Using one shared `HTMLImageElement` load per file, then:

1. Draw onto a hidden `<canvas>` at 200 px longest side, encode as WebP q=0.8 → `thumbSmBlob`.
2. Draw at 800 px longest side, encode as WebP q=0.85 → `thumbMdBlob`.
3. Draw at 32×32, `ctx.getImageData`, pass to `encode()` from the `blurhash` package → `blurhashString`.
4. Capture `naturalWidth` / `naturalHeight`.

The original blob is NOT touched — it goes to S3 as-is.

### 5.4 Upload flow per file

```
1. Client calls server action:
   presignUpload({ filename, mimeType, variants, pool, targetId })
     → Server mints a uuid, returns:
       {
         uuid,
         uploads: [
           { variant: 'original', key, presignedUrl },
           { variant: 'thumb_sm', key, presignedUrl }?,
           { variant: 'thumb_md', key, presignedUrl }?,
         ]
       }
   (Tiny JSON over a server action — no file bytes.)

2. Client PUTs each blob to its presigned URL in parallel — directly to S3.
   Uses XMLHttpRequest (not fetch) so xhr.upload.onprogress reports progress.
   This step never touches Next.js.

3. Client calls server action:
   confirmUpload({
     uuid,
     originalFilename, mimeType, sizeBytes, kind,
     width?, height?, blurhash?, hasThumbSm, hasThumbMd,
     pool, targetId,                // folderId or albumId
   })
     → Server HEADs every declared S3 key (via s3.headObject).
     → Inserts files record.
     → For Documents pool: writes files.folderId = targetId.
     → For Media pool: inserts collection_files row with unique-index protection.
     → Returns the FileRecord.
   (Again tiny JSON — no file bytes.)

4. Client mutation's onSuccess invalidates React Query keys:
   ['folderFiles', folderId] or ['collectionFiles', albumId], plus ['tree'].
```

**Why this is safe for large files:** file bytes never pass through a server action. `presignUpload` and `confirmUpload` exchange only metadata (a few hundred bytes each). The actual `PUT` is an XHR that goes directly to S3 with the presigned URL, so Next's server-action body limit is irrelevant and `xhr.upload.onprogress` still drives the dock's progress bar exactly as described in section 7.4.

**Why HEAD verification:** presigned URLs mean the server trusts the client's claim that the PUT happened. Without HEAD, a malicious client could fabricate a DB record pointing at a nonexistent object. HEAD catches that.

### 5.5 Cross-format replace

Replace uses the same client-side classification + variant generation, then:

1. Client calls `presignUpload` (server action) with a `replaceOf: fileId` hint so the server mints new keys (e.g. `{uuid}_v2.png`). Using new keys — not overwriting the old ones — avoids browser/CDN cache staleness.
2. Client PUTs new variants directly to S3 at those presigned URLs.
3. Client calls the `replaceFile(fileId, …)` server action, which atomically updates `files`: new `s3Key`, `thumbSmKey`, `thumbMdKey`, `mimeType`, `sizeBytes`, `width`, `height`, `blurhash`, `updatedAt`.
4. Old S3 keys become orphans; GC (section 11) cleans them up later.
5. **Kind change is blocked.** The new file's `kind` must equal the old file's `kind` — otherwise referencing components break (e.g. a Hero using `<img>` cannot render a PDF).
6. Within a kind, format change is fine (JPEG → PNG → WebP → AVIF all render in `<img>`).

Puck never stores the file extension or URL — only the `fileId`. Every render re-reads `s3Key` from the `files` record and rebuilds the public URL. Replace is therefore transparent to every existing Puck reference.

### 5.6 Concurrency control

Uploads are scheduled through a central queue (lives in the background ops provider, section 7):

- **Hard cap of 4 concurrent uploads.** Queued ops sit in `status: 'queued'` and run as slots free up.
- **PUT retries:** each variant PUT retries 3× with exponential backoff (500 ms / 1.5 s / 4 s) before marking the op as failed.
- **Failure handling:** on full op failure, the blob is kept in memory for retry from the dock. On dismiss or success, the blob is released. Large in-flight uploads consume RAM — acceptable for v1.

### 5.7 Orphan handling

S3 objects that were PUT successfully but never confirmed (client closed the tab, confirm failed) become orphans. GC is covered in section 11.

---

## 6. Server actions + React Query hooks

**No REST API routes are introduced.** The existing admin uses `'use server'` actions in `apps/admin/lib/db/db-actions.ts` as its single client-facing DB surface (`AdminPage.tsx:17` passes a server action directly as a `useQuery` `queryFn`). The file system follows the same pattern — simpler, fewer files, permission gates live next to the data-access call, and nothing in the pipeline needs a routable URL.

### 6.1 File layout

```
apps/admin/lib/db/file-system-actions.ts    # 'use server' — all server actions
apps/admin/lib/files/file-system-hooks.ts   # client — useQuery / useMutation wrappers
```

The split is mandatory: `'use server'` marks every export as a server action, so React hooks (client code) cannot co-exist in the same file.

### 6.2 Server actions

All wrappers gate on `asset:*` permissions via `requireServerPermission()` and delegate to `dbService`.

```ts
'use server';

// ── Files ──
presignUpload(input: PresignUploadInput): Promise<PresignUploadResult>;   // asset:create
confirmUpload(input: ConfirmUploadInput): Promise<FileRecord>;            // asset:create
getFile(fileId: string): Promise<FileRecord | null>;                      // asset:read
updateFile(fileId: string, patch: UpdateFilePatch): Promise<void>;        // asset:update  (rename, altText)
replaceFile(fileId: string, input: ReplaceFileInput): Promise<void>;      // asset:update
deleteFile(fileId: string): Promise<DeleteResult>;                        // asset:delete  (runs reference scan)
bulkDeleteFiles(fileIds: string[]): Promise<BulkDeleteResult>;            // asset:delete  (partial-success)
searchFiles(q: SearchQuery): Promise<FileRecord[]>;                       // asset:read
getFileReferences(fileId: string): Promise<Reference[]>;                  // asset:read

// ── Documents pool ──
getFolderTree(): Promise<FolderRecord[]>;                                 // asset:read
createFolder(input: CreateFolderInput): Promise<FolderRecord>;            // asset:update  (enforces level ≤ 2)
updateFolder(folderId: string, patch: UpdateFolderPatch): Promise<void>;  // asset:update  (rename, move)
deleteFolder(folderId: string): Promise<void>;                            // asset:delete  (only if empty, not system)
listFolderFiles(folderId: string, page: PageArgs): Promise<FileRecord[]>; // asset:read    (50/page default)
moveFilesToFolder(fileIds: string[], targetFolderId: string): Promise<void>; // asset:update

// ── Media pool ──
getCollectionTree(): Promise<CollectionRecord[]>;                         // asset:read
createCollection(input: CreateCollectionInput): Promise<CollectionRecord>; // asset:update (collections & albums)
updateCollection(collectionId: string, patch: UpdateCollectionPatch): Promise<void>; // asset:update
deleteCollection(collectionId: string): Promise<void>;                    // asset:delete  (only if empty, not system)
listCollectionFiles(collectionId: string, page: PageArgs): Promise<FileRecord[]>; // asset:read
addFilesToAlbum(fileIds: string[], targetAlbumId: string): Promise<void>; // asset:update  (idempotent)
removeFilesFromAlbum(fileIds: string[], sourceAlbumId: string): Promise<{ removed: string[]; blocked: string[] }>; // asset:update

// ── Tree (combined) ──
getTree(): Promise<{ folders: FolderRecord[]; collections: CollectionRecord[] }>; // asset:read
   // metadata only, used by picker and admin pages for navigation.
```

Each body is a one-liner pattern:

```ts
export async function deleteFile(fileId: string): Promise<DeleteResult> {
  await requireServerPermission({ all: ['asset:delete'] });
  const refs = await dbService.findFileReferencesInPuckData(fileId);
  if (refs.length > 0) return { status: 'blocked', references: refs };
  await dbService.deleteFile(fileId);
  return { status: 'deleted' };
}
```

### 6.3 Client hooks

`apps/admin/lib/files/file-system-hooks.ts` wraps each action in a React Query hook with a stable key:

```ts
// Reads — useQuery
useTree()                                    // key: ['tree']
useFolderFiles(folderId, { offset, limit }) // key: ['folderFiles', folderId, { offset, limit }]
useCollectionFiles(albumId, { offset, limit }) // key: ['collectionFiles', albumId, { offset, limit }]
useFile(fileId)                              // key: ['file', fileId]
useFileReferences(fileId)                    // key: ['fileReferences', fileId]
useFileSearch(query)                         // key: ['fileSearch', query]

// Mutations — useMutation with onSuccess invalidation
useUpdateFile()              // invalidates: ['file', fileId], container list
useDeleteFile()              // invalidates: container list, ['tree']
useBulkDeleteFiles()         // invalidates: container list, ['tree']
useReplaceFile()             // invalidates: ['file', fileId], container list
useCreateFolder()            // invalidates: ['tree']
useUpdateFolder()            // invalidates: ['tree']
useDeleteFolder()            // invalidates: ['tree']
useMoveFilesToFolder()       // invalidates: ['folderFiles', *], ['tree']
useCreateCollection()        // invalidates: ['tree']
useUpdateCollection()        // invalidates: ['tree']
useDeleteCollection()        // invalidates: ['tree']
useAddFilesToAlbum()         // invalidates: ['collectionFiles', albumId], ['tree']
useRemoveFilesFromAlbum()    // invalidates: ['collectionFiles', albumId], ['tree']
```

Mutations take their inputs at call-time (not at hook-construction time) so a single hook instance per component can handle many files.

Upload is the only operation that does **not** go through a plain `useMutation`. It runs through the background ops provider (section 7), which internally calls `presignUpload` and `confirmUpload` as server actions and drives the S3 `PUT` itself via XHR. The provider publishes invalidation targets through the op's `invalidateKeys` field, which React Query consumes on op success.

### 6.4 What is deliberately not present

- **No `/api/component-files/*`** — no component-references collection.
- **No `reorder` endpoints** — drag-reorder is out of scope for v1.
- **No REST routes at all.** If a future external caller appears (Railway cron, CI script, third-party ingestion), add a targeted API route at that point; until then, server actions are the whole surface.

---

## 7. Background operations dock

**Purpose:** every long-running operation (uploads, bulk deletes) funnels through a persistent dock so the editor can start work and keep navigating. Inspired by Google Drive's upload tray.

### 7.1 State model

```ts
type Operation = {
  id: string;                          // uuid
  kind: 'upload' | 'bulk-delete';
  title: string;                       // "photo1.jpg" or "Deleting 15 files"
  subtitle?: string;                   // "to Sommerlager 2024 / Day 1"
  status: 'queued' | 'running' | 'success' | 'error' | 'cancelled';
  progress?: number;                   // 0–100, undefined = indeterminate
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  cancel?: () => void;                 // only set for cancellable ops
  retry?: () => Promise<void>;         // only set for failed ops
  invalidateKeys?: QueryKey[];         // React Query keys invalidated on success
  result?: unknown;                    // op-specific (e.g. blocked file list)
};
```

### 7.2 Provider placement

`<BackgroundOpsProvider>` wraps `{children}` in `apps/admin/app/layout.tsx` — **above** the `(dashboard)` and `(editor)` route groups. Critical: this means navigation between `/media/...`, `/documents/...`, `/editor/...`, `/pages` does not unmount the provider, so ops survive route changes.

State is held in a `useRef<Operation[]>` with forced updates via `useSyncExternalStore`. Using raw `useState` would cause hundreds of rerenders per second in every subscriber during upload progress updates.

### 7.3 Dock UI

`apps/admin/components/file-system/BackgroundOpsDock.tsx`, rendered once in the root layout:

- **Desktop:** fixed `bottom-4 right-4`, pill when collapsed, card when expanded. Auto-expands on new op.
- **Mobile:** fixed bottom sheet spanning full width.
- Empty queue → hidden entirely.
- Completed ops fade out after 3 s. Errors stay pinned with a retry button. "Clear completed" action appears when there are ≥2 completed ops.
- `role="region"` with `aria-label="Background tasks"`, each op is `role="status"` with `aria-live="polite"`.
- Respects `prefers-reduced-motion`.

### 7.4 Upload integration

`apps/admin/lib/files/useFileUpload.ts` wraps `client-upload.ts` and registers each file as an op. Per file:

1. Call `presignUpload` **server action** → get presigned URLs (no bytes transit Next.js).
2. `XMLHttpRequest.upload.onprogress` drives the op's `progress` field as the XHR `PUT` streams directly to S3. `fetch` does not expose upload progress, which is why we use XHR.
3. Call `confirmUpload` **server action** → DB row is written, `FileRecord` returned.
4. On success, the provider calls `queryClient.invalidateQueries(...)` for every key in the op's `invalidateKeys`.

Other details:

- **Weighted progress across variants:** original = 90%, each thumbnail = 5%. The op's overall progress is the weighted sum.
- **Cancellation:** `cancel: () => xhr.abort()`. Aborted PUTs leave orphans that GC cleans up. Cancelling before `confirmUpload` means no DB row is written.
- **Invalidation keys:** `[['folderFiles', folderId], ['tree']]` for Documents uploads, `[['collectionFiles', albumId], ['tree']]` for Media.

### 7.5 Bulk delete integration

The op's runner calls the `bulkDeleteFiles(fileIds)` server action, which runs the reference scan per file and returns `{ deleted: string[], blocked: Array<{ fileId, references }> }`.

The op registers as `kind: 'bulk-delete'`. On partial success the dock shows "13 of 15 deleted, 2 blocked" with a "Show details" button that opens the delete-blocked dialog (section 9.2) listing every blocker.

Bulk delete is **not cancellable** once running — server-side already in progress. Cancel button hidden for this kind.

### 7.6 What uses the dock vs inline spinners

**Dock:**
- File uploads (image, video, document)
- Bulk delete (>1 file)
- Orphan GC run (section 11, when it exists)

**Inline spinners (fast ops, no dock):**
- Rename / update alt text
- Single file delete
- Create folder / album / collection
- Single bulk-move (< 10 items)
- Reference scan for detail sheet open

**Rule of thumb:** if the op is "fire and wait on the current screen" and typically completes under 1 s, use an inline spinner. Otherwise use the dock so the editor can navigate away.

### 7.7 `beforeunload` protection

The provider installs a `beforeunload` listener while any op is running. The browser shows its standard "Leave site?" warning. Listener is removed when the queue drains.

---

## 8. CMS UI — overview

### 8.1 Sidebar (flat)

The main app sidebar stays flat:

```
📄 Pages
🖼️  Media
📁 Documents
🔒 Security
```

No nested children. Mobile: sidebar slides in as a `Sheet`.

### 8.2 Route structure

Added under the existing `(dashboard)` route group:

```
app/(dashboard)/media/page.tsx                              → Media landing (album collections grid)
app/(dashboard)/media/[collectionId]/page.tsx               → Inside a collection (albums grid)
app/(dashboard)/media/[collectionId]/[albumId]/page.tsx     → Inside an album (file grid/list)
app/(dashboard)/media/_cms-uploads/page.tsx                 → System album shortcut (or served by [albumId] with isSystemAlbum lookup)

app/(dashboard)/documents/page.tsx                          → Documents landing (tree + root-level state)
app/(dashboard)/documents/[[...folderPath]]/page.tsx        → Inside a folder
```

### 8.3 Component rings (from the walkthrough)

Shared file viewing primitives — **Ring 1** — live in `apps/admin/components/file-system/`:

```
file-system/
├── FileCard.tsx               # thumbnail + blurhash + lazy load + optional checkbox
├── FileGrid.tsx               # virtualized grid of FileCards (TanStack Virtual)
├── FileList.tsx               # virtualized table rows
├── FileUploadZone.tsx         # drop target wrapping useFileUpload
├── FileDetailSheet.tsx        # slide-in metadata + actions panel
├── BackgroundOpsDock.tsx
└── hooks/
    ├── useTree.ts
    ├── useFolderFiles.ts
    ├── useCollectionFiles.ts
    └── useFileUpload.ts
```

Section-specific navigation — **Ring 2**:

```
apps/admin/components/media/
├── CollectionBrowser.tsx      # landing grid + drill-in nav
├── CollectionCard.tsx
├── AlbumCard.tsx
├── AddToAlbumDialog.tsx
└── RemoveFromAlbumDialog.tsx

apps/admin/components/documents/
├── FolderTree.tsx             # secondary sidebar tree with CMS Uploads pinned at top
├── FolderBreadcrumb.tsx
├── NewFolderButton.tsx        # disabled at level 2
└── MoveToFolderDialog.tsx
```

Page shells and picker — **Ring 3**:

```
apps/admin/app/(dashboard)/media/...                        # full-page shells
apps/admin/app/(dashboard)/documents/...
apps/admin/components/file-picker/
├── FilePickerProvider.tsx     # React context, wraps the Puck editor layout
├── FilePickerModal.tsx        # Dialog, takes pool: 'media' | 'documents'
└── usePickerSelection.ts      # selection state hook
```

Ring 2 components take a `mode: 'page' | 'picker'` prop so the same nav works in both contexts (page mode navigates via URL, picker mode navigates within the modal).

---

## 9. Media section UI

### 9.1 Landing — `/media`

```
Media
─────────────────────────────────────────
[ 🔍 Search media ]                [+ New]

┌──────────────────────────────────┐
│  📥 CMS Uploads (system album)   │ ← pinned full-width card, different background
│  124 files                       │
└──────────────────────────────────┘

─── Album Collections ───

┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ cover  │ │ cover  │ │ cover  │ │ cover  │
├────────┤ ├────────┤ ├────────┤ ├────────┤
│ Title  │ │ Title  │ │ Title  │ │ Title  │
│3 albums│ │2 albums│ │5 albums│ │8 albums│
└────────┘ └────────┘ └────────┘ └────────┘
```

- **CMS Uploads card is pinned at the top**, full-width, visually distinct. Clicking it navigates directly into the system album view (bypassing the album-collection → album drill).
- **Album Collection cards** show the manually-set cover (styled placeholder if null), title, and "N albums" count.
- **No "year" UI in v1** (schema retained).
- **No "recent files" row** on the landing.
- **`[+ New]`** opens "New Album Collection." "New Album" is only available inside a collection.
- **Per-collection manage actions** (rename, delete, change cover) live inside the collection, not on landing cards.
- **Mobile:** cards reflow 1 → 2 → 3 → 4 columns by breakpoint.

### 9.2 Inside a collection — `/media/[collectionId]`

```
Media  ›  Sommerlager 2024                     [⋯ menu]
─────────────────────────────────────────────────────
12 albums · 847 files

[ 🔍 Search in this collection ]         [+ New Album]

┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ Day 1  │ │ Day 2  │ │Campfire│ │ Hike   │
│64 files│ │82 files│ │31 files│ │47 files│
└────────┘ └────────┘ └────────┘ └────────┘
```

- **`[⋯ menu]`** on the collection header: Rename, Change cover, Delete (empty-only).
- **Breadcrumb** uses `apps/admin/components/ui/Breadcrumb.tsx`.
- **New Album** creates an empty album inside this collection.

### 9.3 Inside an album — `/media/[collectionId]/[albumId]`

The working file manager for Media.

```
Media › Sommerlager 2024 › Day 1               [⋯ menu]
─────────────────────────────────────────────────────
64 files · 214 MB

[ 🔍 Filter files ]       [Grid|List] [⇅ Sort ▾]

┌──────── drop zone (collapsed bar) ─────────┐
│  Drop files here, or click to upload       │
└─────────────────────────────────────────────┘

┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
│ □ │ │ □ │ │ □ │ │ □ │ │ □ │ │ □ │ │ □ │
└───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘

[bulk bar: 3 selected · Add to album · Remove from this album · Delete · ✕]
```

- **Grid view is default in Media.** Grid/List toggle persists per-section in `localStorage`.
- **Drop zone** is a slim collapsed bar by default, expands on drag-hover. On mobile it's an "Upload" button.
- **Virtualized grid** uses `@tanstack/react-virtual`. Tiles use `_thumb_sm` with blurhash backing.
- **Sort dropdown:** Newest (default) / Oldest / Name. No manual drag reorder in v1.
- **Selection:** checkbox appears on tile hover; once anything is selected, all checkboxes are visible. Mobile uses long-press to enter selection mode.
- **Bulk bar** appears at `selectedCount > 0`, sticky on mobile:
  - **Add to album** — opens `AddToAlbumDialog` with an album picker. Inserts a `collection_files` row linking each selected file to the target. Files keep their existing album memberships. Idempotent — files already in the target are silently skipped. Excludes the current album and the CMS Uploads system album as destinations.
  - **Remove from this album** — deletes the `collection_files` row for the current album for each selected file. Files that would be left with zero album memberships are blocked; the dialog lists them with a "Delete instead?" action.
  - **Delete** — runs reference scan via bulk-delete, shows partial-success dialog if any files are blocked.
- **Relocating a file** (e.g. "move this out of CMS Uploads into Day 1") is two explicit steps: Add to the target album, then Remove from the current one. No dedicated "Move" verb.
- **Multi-album membership is supported.** A Media file can be in as many albums as the editor adds it to. The minimum-1 invariant is enforced at the API layer: removing a file from its last album is blocked with "This is the last album — use Delete instead."
- **CMS Uploads album behavior** — identical to other albums with three system exceptions:
  - Album `[⋯ menu]` has no Rename/Delete (system flag).
  - The Add-to-album dialog excludes CMS Uploads as a destination (it's a landing-only album, not a target).
  - Files uploaded via the Media picker's quick-upload land here.

### 9.4 Delete-blocked dialog

Shown when a delete is blocked by Puck references (single or bulk):

```
Cannot delete "IMG_4821.jpg"

This file is used in 2 places:

  • Hero on /home
        [Open page →]  [Open in editor →]

  • Gallery on /camps/2024
        [Open page →]  [Open in editor →]

Remove it from those components first.

                                         [ Close ]
```

- "Open page" → site URL in a new tab.
- "Open in editor" → admin editor URL for that page in a new tab.
- For bulk deletes, the dialog lists every blocked file with its references nested beneath.

---

## 10. Documents section UI

### 10.1 Landing — `/documents`

Two-column layout on desktop:

```
┌──────────────┬─────────────────────────────────┐
│              │ Documents › General › Flyer     │
│ 📥 CMS       │                                 │
│   Uploads    │ ───────────────────────────── │
│ ──────────   │   Name          Size     Date  │
│ ▾ General    │ 📄 summer.pdf   1.2 MB  Mar 4  │
│   ▸ Flyer    │ 📄 winter.pdf   800 KB  Mar 1  │
│   ▸ Info     │ 🖼️  cover.jpg    340 KB  Feb 28 │
│              │ 📄 rules.pdf    220 KB  Feb 22 │
│ ▾ Admin      │                                 │
│              │  (drop to upload here)          │
│ [+ New Folder]│                                │
└──────────────┴─────────────────────────────────┘
```

- **Secondary sidebar inside the Documents page** holds the `FolderTree`. Uses `apps/admin/components/ui/ScrollArea.tsx`. The main app sidebar stays flat.
- **CMS Uploads pinned at the top** of the tree with a visual divider between it and user-created folders.
- **Breadcrumb** uses the existing `Breadcrumb` component.
- **List is default in Documents** (flipped from Media). Columns: icon, name, size, date, `[⋯ menu]`. No uploader column (we display "Someone"), no usage count column. Extras live in the detail sheet.
- **File kind icons** use `lucide-react` (already a transitive shadcn dep): `FileText` for PDF/docs, `FileArchive` for ZIP, `Image` fallback for images in list view (grid view shows real thumbnails).
- **Uploads** target the **currently selected folder**. `[+ Upload]` is disabled when no folder is selected (the virtual root has no files). Drag-and-drop on the file list uploads to the current folder.
- **`[+ New Folder]`** sits at the bottom of the tree sidebar. Disabled when the current folder is at level 2.
- **Empty folder** shows a drop-zone message filling the right panel ("Drop files here to upload, or click Upload").
- **No files live at the virtual Documents root.** Landing with no folder selected shows "Select a folder or upload to CMS Uploads" messaging.

### 10.2 Mobile Documents

- **Two-column layout collapses** into a single-column with a "Folders" button that opens the tree as a `Sheet` from the left.
- **Breadcrumb** is the primary upward navigation.
- **List view is enforced** (grid view hidden at mobile widths — mixed file kinds make grid noisy on phone-sized displays).

### 10.3 Bulk actions

Same selection pattern as Media. Bulk bar:
- **Move to folder** — opens `MoveToFolderDialog` with a folder tree (CMS Uploads included as a valid destination). Atomically updates `files.folderId` for every selected file.
- **Delete** — same bulk-delete flow with reference scan.

No "Remove from folder" verb (removing = deleting for Documents).

---

## 11. File detail sheet

`apps/admin/components/file-system/FileDetailSheet.tsx`. Opens on tile click or row click in both sections. Wraps `apps/admin/components/ui/Sheet.tsx`.

```
                        ┌─────────────────────────────────┐
                        │                            [✕]  │
                        │ ─────────────────────────────── │
                        │    ┌─────────────────────┐      │
                        │    │     [ preview ]     │      │
                        │    └─────────────────────┘      │
                        │                                 │
                        │ summer_camp_2024.jpg      [✎]   │
                        │ 2.4 MB · 3840×2160 · JPEG       │
                        │ Uploaded Mar 4 by Someone       │
                        │                                 │
                        │ Alt text                        │
                        │ ┌─────────────────────────────┐ │
                        │ │ Kids jumping into the lake  │ │
                        │ └─────────────────────────────┘ │
                        │                                 │
                        │ Used in                         │
                        │ • Hero on /home                 │
                        │   [Open page] [Open editor]     │
                        │ • Gallery on /camps/2024        │
                        │   [Open page] [Open editor]     │
                        │ ─────────────────────────────── │
                        │ [Download] [Replace] [Delete]   │
                        └─────────────────────────────────┘
```

### 11.1 Preview by kind

- **Image (raster):** `<img src={thumbMdUrl}>`. Click to open the original in a new tab.
- **SVG:** `<img src={originalUrl}>`. Inline because `<img>` sandboxes scripts.
- **Video:** `<video controls src={originalUrl}>`. Large videos slow to load; acceptable.
- **Document:** large generic file icon + filename + "Open in new tab" button. **No embedded PDF viewer in v1.**

### 11.2 Metadata and editing

- **Filename:** click the pencil icon → becomes an input → Enter or blur calls `useUpdateFile().mutate({ originalFilename })`. Only `originalFilename` changes; the `s3Key` uuid stays.
- **Alt text:** simple `<textarea>`, debounced-save on blur via `useUpdateFile().mutate({ altText })`. Only shown for `kind: 'image'`.
- **Size / dimensions / date / uploader:** read-only. Uploader shows "Someone" for v1.

### 11.3 "Used in" list

Populated by the `useFileReferences(fileId)` hook which wraps the `getFileReferences` server action (which in turn calls `findFileReferencesInPuckData(fileId)`).

- Rendered with a skeleton while the scan runs.
- **Eager scan on sheet open** for v1. If it becomes slow, migrate to a materialized index later.
- Empty state: "Not used in any page."
- Each reference shows `componentType on pagePath` with "Open page" and "Open editor" buttons.

### 11.4 Navigation between files

**No prev/next arrows.** Clicking another tile or row in the parent view swaps the detail sheet's content to that file. Escape closes the sheet.

### 11.5 Actions

- **Download:** `<a href={originalUrl} download>`. Works for every kind.
- **Replace:** opens a file input, runs the full client-side resize pipeline (if image) against the new blob, then uses the upload-style flow (`presignUpload` → S3 PUT → `replaceFile` server action). Blocked if the new file's `kind` differs from the current file's `kind`. Cross-format within a kind is fine (JPEG → WebP, PDF → DOCX, etc.). Because the new blob can be large, this runs through the background ops dock.
- **Delete:** calls `useDeleteFile().mutate(fileId)`. If the action returns `{ status: 'blocked', references }`, shows the delete-blocked dialog (section 9.4). Otherwise confirms, invalidates, closes the sheet.

**Media-only actions** (shown only when the file has a `collection_files` row):

- **Album memberships list:** a small section above the "Used in" block listing every album this file is in, with a remove (✕) button next to each row. Clicking ✕ calls `useRemoveFilesFromAlbum().mutate({ fileIds: [fileId], sourceAlbumId })`; blocked if it's the last album (toast message → "This is the last album — use Delete instead").
- **Add to album:** button that opens `AddToAlbumDialog` for this single file. Same dialog component as the bulk action.

---

## 12. Puck editor integration

### 12.1 Custom fields

Two separate fields in `packages/puck-web/fields/`:

```ts
// media-field.ts
export const mediaField = (opts: {
  mode: 'single' | 'multi';
  accept?: ('image' | 'video')[];      // default: both
  allowCollection?: boolean;            // allow selecting a whole album. default: false
}): CustomField<MediaRef | MediaRef[] | undefined>

export type MediaRef =
  | { type: 'file'; fileId: string }
  | { type: 'collection'; collectionId: string };


// document-field.ts
export const documentField = (opts: {
  mode: 'single' | 'multi';
  accept?: string[];                    // MIME filters, e.g. ['application/pdf']
}): CustomField<DocumentRef | DocumentRef[] | undefined>

export type DocumentRef = { type: 'file'; fileId: string };
```

- **No tab switcher in the picker** — the field type determines the pool.
- **Collection refs are a mediaField-only feature**, opt-in via `allowCollection`. Use case: a Gallery component pointing at an entire album.
- **Document refs are file-only**, no folder-as-ref.

### 12.2 Picker context

`packages/puck-web/fields/file-picker-context.ts` defines the context:

```ts
type FilePickerContextValue = {
  openPicker: (config: PickerConfig) => Promise<PickerSelection | null>;
};

type PickerConfig = {
  pool: 'media' | 'documents';
  mode: 'single' | 'multi';
  accept?: unknown;                  // forwarded from field opts
  allowCollection?: boolean;
};
```

When admin is not present (site render, Storybook), the default context throws a dev-time error.

### 12.3 Field rendering

Each field's `render` function shows:
- A thumbnail preview (if an image is selected, resolved via the `useFile(fileId)` hook)
- An icon + filename fallback for other kinds
- A "Change" / "Select" button that calls `openPicker(...)` from the context

### 12.4 Picker modal

`apps/admin/components/file-picker/FilePickerModal.tsx` — wraps `apps/admin/components/puck-web/ui/Dialog.tsx`.

Layout:

```
┌─ Select a file ─────────────────────────────── [✕] ─┐
│                                                      │
│                              [ 🔍 Search ]           │
│  ──────────────────────────────────────────────────  │
│  ┌────────────┬──────────────────────────────────┐  │
│  │            │ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐    │  │
│  │ (section   │ │ □ │ │ □ │ │ ☑ │ │ □ │ │ □ │    │  │
│  │  nav)      │ └───┘ └───┘ └───┘ └───┘ └───┘    │  │
│  │            │                                  │  │
│  └────────────┴──────────────────────────────────┘  │
│                                                      │
│  Selected (2):                                       │
│  [img] [img]                                         │
│  ──────────────────────────────────────────────────  │
│  [ ⬆ Drop file / click to upload ]                   │
│                               [Cancel] [Confirm]     │
└──────────────────────────────────────────────────────┘
```

**Behavior:**
- **Section nav** (left panel) is Ring 2 reused with `mode="picker"`:
  - `pool: 'media'` → `CollectionBrowser` with CMS Uploads pinned at top.
  - `pool: 'documents'` → `FolderTree` with CMS Uploads pinned at top.
- **Right panel** is shared `FileGrid` or `FileList` rendering the current container's files. Click toggles selection.
- **Single mode:** no checkboxes, the selected tile is highlighted with a ring. Selection tray is hidden entirely. Confirming with nothing selected is disabled.
- **Multi mode:** checkboxes on tiles, selection tray below the grid showing thumbnails with an X to remove. Selection persists across folder/album navigation.
- **`accept` filter** dims non-matching files to 40% opacity with `cursor-not-allowed`. Non-matching files stay visible so the editor knows what's in the container.
- **`allowCollection`** (media only) adds a checkbox next to each album in the section nav. Checking it adds a `{ type: 'collection', collectionId }` to the selection. The selection tray shows "📁 Sommerlager 2024 / Day 1 — 64 files".
- **Upload zone** is always visible at the bottom. Upload target:
  - Media picker → always lands in the **Media CMS Uploads system album**.
  - Documents picker → always lands in the **Documents CMS Uploads system folder**.
- **Uploaded files auto-select on completion** and the picker auto-navigates to the relevant CMS Uploads so the editor sees the file appear.
- **Confirm** resolves the `openPicker` promise with the current selection and closes. **Cancel / Escape / backdrop click** closes silently (no "discard selection?" prompt — selection state is low-stakes).
- **Mobile:** full-screen modal (not centered), section nav collapses into a drawer button, selection tray stays above the footer.

### 12.5 Ref resolution

`packages/puck-web/lib/resolve-file-refs.ts`:

```ts
type AnyFileRef = MediaRef | DocumentRef;

async function resolveFileRefs(
  refs: AnyFileRef[],
  db: DatabaseService
): Promise<FileRecord[]>
```

Logic:
- `type: 'file'` → `db.getFile(fileId)`.
- `type: 'collection'` → `db.resolveCollectionRef(collectionId)`, dedupe, sort by `collection_files.sortOrder`.

Lives in `packages/puck-web/lib/` so both admin (field previews) and site (page render) can call it.

### 12.6 Wiring in the editor

`apps/admin/app/(editor)/**/layout.tsx` wraps Puck in `<FilePickerProvider>`. The provider owns the modal and exposes `openPicker` via the context that `mediaField`/`documentField` consume.

Existing Puck components (Hero, etc.) continue using the legacy `uploadFileField`. New components adopting the file system use `mediaField(...)` or `documentField(...)` at their leisure.

### 12.7 Site-side rendering

`apps/site` calls `resolveFileRefs()` once per page in its Puck data loader and passes resolved `FileRecord[]` to components. Avoids N+1 resolution per component. Site needs `S3_PUBLIC_URL_BASE` only.

---

## 13. Orphan GC

No job queue exists. Two options:

1. **Manual admin action (v1).** A button on a `/media` settings page: "Clean up orphaned files." Scans `files` for records whose `folderId` is null AND which have no `collection_files` row. Also scans S3 (list bucket, compare to known `s3Key`/`thumbSmKey`/`thumbMdKey` values) to find objects with no matching `files` record — these are PUT-but-not-confirmed orphans. Both lists surface in a confirmation dialog before deletion.
2. **Cron endpoint (later).** `POST /api/files/gc` gated by a shared secret, triggered externally (Railway cron, GitHub Action).

Ship (1) first. (2) can be added later without data-model changes.

---

## 14. Implementation order

Ordered so each step is independently testable:

1. **Env + S3 client.** Add env vars, implement `apps/admin/lib/storage/s3.ts`, verify presign + HEAD + delete against a Railway bucket from a scratch script.
2. **Mongo schemas + `DatabaseService` methods.** Extend the interface, implement in `MongoService` and `MockDatabaseService`. Seed both CMS Uploads system containers on first read. Unit test against the mock impl.
3. **Server actions** in `apps/admin/lib/db/file-system-actions.ts`. One wrapper per `DatabaseService` method plus `presignUpload` / `confirmUpload` / `replaceFile` / `bulkDeleteFiles`. All gated by `asset:*` permissions via `requireServerPermission()`. No UI yet — exercise them from a scratch client component or a `__playground` page.
4. **React Query hooks** in `apps/admin/lib/files/file-system-hooks.ts`. `useQuery` wrappers for the read actions, `useMutation` wrappers for the write actions with `onSuccess` invalidations. Reusable from every Ring 1/2/3 component.
5. **Client upload pipeline.** `apps/admin/lib/files/client-upload.ts` with `browser-image-compression`, `blurhash`, and the XHR progress wrapper. Test via a scratch page that uploads into CMS Uploads.
6. **Background ops provider + dock.** `BackgroundOpsProvider` in root layout, `BackgroundOpsDock` component. Wire the upload hook into it. Confirm ops survive route changes.
7. **Shared file-viewing primitives** (Ring 1). `FileCard`, `FileGrid`, `FileList`, `FileUploadZone`, `FileDetailSheet`.
8. **Documents section** (Ring 2 + Ring 3). `FolderTree`, `FolderBreadcrumb`, `NewFolderButton`, `MoveToFolderDialog`, the `(dashboard)/documents` pages.
9. **Media section** (Ring 2 + Ring 3). `CollectionBrowser`, `CollectionCard`, `AlbumCard`, `AddToAlbumDialog`, `RemoveFromAlbumDialog`, the `(dashboard)/media` pages.
10. **Picker context + modal.** `FilePickerProvider`, `FilePickerModal`. Wire into the editor layout.
11. **`mediaField` + `documentField`** in `packages/puck-web/fields/`. Add a `Gallery` example component or update an existing one to use `mediaField({ allowCollection: true })`. Resolve refs on the site side via `resolveFileRefs`.
12. **Delete protection.** Implement `findFileReferencesInPuckData()`, wire into the `deleteFile` and `bulkDeleteFiles` actions, surface the delete-blocked dialog.
13. **Replace file.** Implement the `replaceFile` server action with kind-match enforcement. Wire into the detail sheet, reusing the upload pipeline and background ops dock.
14. **Sidebar entries** in `AppSidebar.tsx` + add `asset:read` to `assignablePermissions` and relevant roles in `defaultSecurityConfig`.
15. **Orphan GC UI** (manual button).

---

## 15. Out of scope for v1

Explicitly deferred:

- Migration of existing `uploadFileField` base64 dataURLs to the new file system.
- Populating `uploadedBy` (waits on Keycloak migration).
- Snapshot-mode refs.
- Drag-and-drop reorder inside albums or folders.
- Captions on `collection_files`.
- Embedded PDF / doc preview in the detail sheet.
- Video thumbnail generation (client-side poster frame).
- `next/image` or CDN optimization (serves originals directly via `<img>`).
- Automated orphan GC via cron.
- Audit log of file operations.
- Prev/next arrows in the detail sheet.
- Global/cross-section search.

---

## 16. Touchpoints summary

### Created

```
apps/admin/lib/storage/s3.ts
apps/admin/lib/files/client-upload.ts
apps/admin/lib/files/xhr-put.ts
apps/admin/lib/files/useFileUpload.ts
apps/admin/lib/files/file-system-hooks.ts    # useQuery / useMutation wrappers

apps/admin/lib/db/file-system-actions.ts     # 'use server' — all file-system actions

apps/admin/app/(dashboard)/media/page.tsx
apps/admin/app/(dashboard)/media/[collectionId]/page.tsx
apps/admin/app/(dashboard)/media/[collectionId]/[albumId]/page.tsx
apps/admin/app/(dashboard)/documents/page.tsx
apps/admin/app/(dashboard)/documents/[[...folderPath]]/page.tsx

apps/admin/components/file-system/FileCard.tsx
apps/admin/components/file-system/FileGrid.tsx
apps/admin/components/file-system/FileList.tsx
apps/admin/components/file-system/FileUploadZone.tsx
apps/admin/components/file-system/FileDetailSheet.tsx
apps/admin/components/file-system/BackgroundOpsDock.tsx
apps/admin/components/file-system/BackgroundOpsProvider.tsx

apps/admin/components/media/CollectionBrowser.tsx
apps/admin/components/media/CollectionCard.tsx
apps/admin/components/media/AlbumCard.tsx
apps/admin/components/media/AddToAlbumDialog.tsx
apps/admin/components/media/RemoveFromAlbumDialog.tsx

apps/admin/components/documents/FolderTree.tsx
apps/admin/components/documents/FolderBreadcrumb.tsx
apps/admin/components/documents/NewFolderButton.tsx
apps/admin/components/documents/MoveToFolderDialog.tsx

apps/admin/components/file-picker/FilePickerProvider.tsx
apps/admin/components/file-picker/FilePickerModal.tsx
apps/admin/components/file-picker/usePickerSelection.ts

packages/puck-web/fields/media-field.ts
packages/puck-web/fields/document-field.ts
packages/puck-web/fields/file-picker-context.ts
packages/puck-web/lib/resolve-file-refs.ts
```

### Modified

```
apps/admin/lib/db/db.ts                             # extend DatabaseService interface
apps/admin/lib/db/db-mongo-impl.ts                  # new methods + indexes + seeding
apps/admin/lib/db/db-mock-impl.ts                   # in-memory impl
apps/admin/lib/db/db-actions.ts                     # permission-wrapped wrappers
apps/admin/lib/env.ts                               # S3 env vars
apps/admin/lib/security/security-config.ts          # add asset:read
apps/admin/app/layout.tsx                           # wrap in <BackgroundOpsProvider>
apps/admin/app/(editor)/**/layout.tsx               # wrap Puck in <FilePickerProvider>
apps/admin/components/AppSidebar.tsx                # Media + Documents entries
apps/admin/components/ui/Sidebar.tsx                # (only if needed for entries)
apps/admin/package.json                             # add deps (see below)
.env                                                # S3 env vars (root)
```

### New package.json dependencies (admin)

```
@aws-sdk/client-s3
@aws-sdk/s3-request-presigner
browser-image-compression
blurhash
@tanstack/react-virtual
```

`lucide-react` is assumed present via shadcn. `framer-motion` may be needed for the dock animation; add only if not already present.

---

## 17. Walkthrough decision log (for implementers)

This plan is the output of a full UX walkthrough. Key decisions that differ from the original brief are listed here so implementers can understand the "why" without re-reading the chat:

1. **All image processing is client-side**, no sharp, no server CPU. Enables the "no caps on file sizes" rule without server memory concerns.
2. **Two disjoint pools** (Documents with `folderId`, Media with `collection_files`). Files never cross between pools.
3. **`folder_files` collection was dropped** in favor of `files.folderId` because the 1:1 Documents invariant is better enforced at schema level.
4. **`component_files` collection was dropped** in favor of on-demand `puck-data` scanning at delete time and detail-open time.
5. **`mode: 'live' | 'snapshot'` was dropped.** All refs are live.
6. **Two separate Puck custom fields** (`mediaField`, `documentField`) rather than one unified field with tabs. The pool is determined by the field type.
7. **CMS Uploads exists twice** — once in each pool as a system container. They share only a name and behavior.
8. **Multi-album membership for Media files.** A file can be a member of many albums at once. The minimum-1 invariant is enforced at the API layer (remove-from-last-album is blocked, editors Delete instead). Two Media verbs: **Add to album** and **Remove from this album**. No dedicated "Move" verb — relocating is Add + Remove as two explicit steps.
9. **`collection_files` uniqueness** is `(collectionId, fileId)`, not `fileId` alone — a file cannot be duplicated within one album but can belong to many.
10. **Background operations dock** in root layout, above route groups, so ops survive navigation.
11. **Replace file** preserves `fileId` and uses new S3 keys for the new variants (avoids cache staleness). Kind change is blocked.
12. **Permissions reuse** the existing `asset:create/update/delete` slots in `security-config.ts:1`; only `asset:read` is new.
13. **Ring 1/2/3 component split** — file-viewing primitives are shared across all quadrants (admin pages, picker modal), section navigation is shared between its admin page and picker tab, page/modal shells are not shared.
14. **Detail sheet is unified** (no separate lightbox). Clicking another file in the parent view replaces the sheet content — no prev/next arrows.
15. **List is default for Documents, grid is default for Media.** Each toggle persists per-section in `localStorage`.
16. **Mobile:** main sidebar uses existing `Sheet` pattern; Documents tree collapses into a drawer; Media grid reflows by breakpoint; detail sheet becomes full-screen / bottom sheet.
17. **Manual orphan GC** via admin button in v1, automated cron deferred.
18. **No file size caps** on upload (user decision, trading off longer upload times for no archival loss).
19. **Server actions + React Query, no REST routes.** Client-facing DB access is a set of `'use server'` actions in `lib/db/file-system-actions.ts` (mirrors the existing `db-actions.ts` pattern used by `AdminPage.tsx`). `useQuery` / `useMutation` hooks live in `lib/files/file-system-hooks.ts` (split is mandatory — `'use server'` cannot coexist with React hooks in one file). No `app/api/*` routes are introduced. File bytes never transit a server action: `presignUpload` / `confirmUpload` exchange only metadata, and the XHR `PUT` goes directly to S3, so Next's server-action body limit is irrelevant and `xhr.upload.onprogress` still drives dock progress.

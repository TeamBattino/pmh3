/**
 * Shared domain types for the CMS file system.
 *
 * Two disjoint pools:
 *   - Documents (files stored 1:1 in a folder via `folderId`)
 *   - Media (files stored many-to-many in albums via the `collection_files`
 *     join collection; `folderId` is always null)
 *
 * Schema rules are enforced at the API layer — see section 3 of
 * `cms-file-system-plan.md`.
 */

export type FileKind = "image" | "video" | "document";

export type FileRecord = {
  id: string;
  uuid: string;
  kind: FileKind;

  /** Non-null iff the file belongs to the Documents pool. */
  folderId: string | null;

  originalFilename: string;
  altText: string | null;
  mimeType: string;
  sizeBytes: number;

  s3Key: string;
  thumbSmKey: string | null;
  thumbMdKey: string | null;
  thumbLgKey: string | null;
  width: number | null;
  height: number | null;
  blurhash: string | null;

  /**
   * Presigned read URLs populated server-side by `enrichFileRecord` before
   * returning the record to a client/server action consumer. Undefined iff
   * the record was fetched via a code path that doesn't need signed URLs
   * (e.g. internal server-to-server lookups).
   */
  signedUrl?: string;
  signedThumbSmUrl?: string | null;
  signedThumbMdUrl?: string | null;
  signedThumbLgUrl?: string | null;

  uploadedAt: Date;
  /** Populated once Keycloak migration lands. v1 always writes null. */
  uploadedBy: string | null;
};

export type FolderRecord = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  ancestorIds: string[];
  level: number;
  sortOrder: number;
  isSystemFolder: boolean;
  createdAt: Date;
};

export type CollectionType = "album_collection" | "album";

export type CollectionRecord = {
  id: string;
  type: CollectionType;
  title: string;
  slug: string;
  description: string | null;
  year: number | null;
  coverFileId: string | null;
  parentId: string | null;
  sortOrder: number;
  isSystemAlbum: boolean;
  createdAt: Date;
};

export type CollectionFileRecord = {
  id: string;
  collectionId: string;
  fileId: string;
  sortOrder: number;
  addedAt: Date;
};

// ── Input / patch types ─────────────────────────────────────────────────

export type CreateFileInput = {
  uuid: string;
  kind: FileKind;
  originalFilename: string;
  altText: string | null;
  mimeType: string;
  sizeBytes: number;
  s3Key: string;
  thumbSmKey: string | null;
  thumbMdKey: string | null;
  thumbLgKey: string | null;
  width: number | null;
  height: number | null;
  blurhash: string | null;
  pool:
    | { kind: "documents"; folderId: string }
    | { kind: "media"; albumId: string };
};

export type UpdateFilePatch = {
  originalFilename?: string;
  altText?: string | null;
};

export type ReplaceFileInput = {
  s3Key: string;
  thumbSmKey: string | null;
  thumbMdKey: string | null;
  thumbLgKey: string | null;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  blurhash: string | null;
  /** Old keys to schedule for deletion. */
  previousKeys: string[];
};

export type SearchQuery = {
  text?: string;
  kind?: FileKind;
  folderId?: string;
};

export type PageArgs = { offset: number; limit: number };

export type CreateFolderInput = {
  name: string;
  parentId: string | null;
};

export type UpdateFolderPatch = {
  name?: string;
  parentId?: string | null;
};

export type CreateCollectionInput = {
  type: CollectionType;
  title: string;
  parentId: string | null;
};

export type UpdateCollectionPatch = {
  title?: string;
  description?: string | null;
  coverFileId?: string | null;
};

/**
 * A single location in `puck-data` that references a file id.
 */
export type Reference = {
  /** Page path for pages, or `"__navbar__"` / `"__footer__"` for those docs. */
  pageId: string;
  componentId: string;
  propPath: string;
};

export type RemoveFromAlbumResult = {
  removed: string[];
  blocked: string[];
};

export type DeleteFileResult =
  | { status: "deleted" }
  | { status: "blocked"; references: Reference[] };

export type BulkDeleteResult = {
  deleted: string[];
  blocked: Array<{ fileId: string; references: Reference[] }>;
};

/**
 * Read-only preview of a folder cascade delete. Powers the confirmation
 * modal so the user sees what they're about to wipe, and any blocking
 * references, before committing.
 */
export type CascadeDeletePreview = {
  /** Total files in the subtree (self + all descendants). */
  fileCount: number;
  /** Descendant folder count (does NOT include the root folder itself). */
  subfolderCount: number;
  /**
   * Files inside the subtree that have puck-data references. Any entry
   * here hard-blocks the cascade — the user has to unreference them first.
   */
  blockedFiles: Array<{
    fileId: string;
    filename: string;
    references: Reference[];
  }>;
};

/**
 * Result of a folder cascade delete. When `blocked` is non-empty, nothing
 * was touched — cascade aborts atomically on the first reference found.
 */
export type CascadeDeleteResult = {
  deletedFileIds: string[];
  /** Includes the root folder. */
  deletedFolderIds: string[];
  /** S3 keys the caller should free after a successful cascade. */
  s3Keys: string[];
  blocked: Array<{
    fileId: string;
    filename: string;
    references: Reference[];
  }>;
};

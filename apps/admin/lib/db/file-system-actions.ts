"use server";

import { randomUUID } from "crypto";
import { requireServerPermission } from "@/lib/security/server-guard";
import {
  deleteObjects,
  enrichFileRecord,
  enrichFileRecords,
  headObject,
  presignPut,
  signedReadUrl,
} from "@/lib/storage/s3";
import { isMediaAllowed } from "@/lib/files/classify";
import { getDbService } from "./db";
import type {
  BulkDeleteResult,
  CascadeDeletePreview,
  CascadeDeleteResult,
  CollectionRecord,
  CreateCollectionInput,
  CreateFolderInput,
  DeleteFileResult,
  FileKind,
  FileRecord,
  FolderRecord,
  PageArgs,
  Reference,
  RemoveFromAlbumResult,
  SearchQuery,
  UpdateCollectionPatch,
  UpdateFilePatch,
  UpdateFolderPatch,
} from "./file-system-types";

/**
 * Public file-system server actions.
 *
 * Mirrors the existing `db-actions.ts` pattern: each call gates on an
 * `asset:*` permission via `requireServerPermission()` and delegates to
 * `dbService`. File bytes never transit these actions — only metadata —
 * because browser-to-S3 uploads go over presigned PUT URLs.
 */

// ── Uploads ────────────────────────────────────────────────────────────

export type PresignUploadVariant = {
  variant: "original" | "thumb_sm" | "thumb_md" | "thumb_lg";
  contentType: string;
  /** Arbitrary suffix appended to the key, e.g. `.jpg` or `_thumb_sm.webp`. */
  keySuffix: string;
};

export type PresignUploadInput = {
  variants: PresignUploadVariant[];
  /** When set, the server mints new keys that do not collide with the
   *  existing file's keys so replace can be cache-safe. */
  replaceOf?: string;
};

export type PresignUploadResult = {
  uuid: string;
  uploads: Array<{
    variant: PresignUploadVariant["variant"];
    key: string;
    presignedUrl: string;
  }>;
};

export async function presignUpload(
  input: PresignUploadInput
): Promise<PresignUploadResult> {
  await requireServerPermission({ all: ["asset:create"] });
  // Use a fresh uuid each call; on replace, we bump a `_v{n}` suffix so the
  // new variants don't collide with the old ones in the bucket or CDN.
  const uuid = randomUUID();
  const prefix = input.replaceOf ? `${uuid}_v2` : uuid;
  const uploads = await Promise.all(
    input.variants.map(async (v) => {
      const key = `${prefix}${v.keySuffix}`;
      const presignedUrl = await presignPut(key, v.contentType);
      return { variant: v.variant, key, presignedUrl };
    })
  );
  return { uuid, uploads };
}

export type ConfirmUploadInput = {
  uuid: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  kind: FileKind;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
  blurhash?: string | null;
  keys: {
    original: string;
    thumbSm?: string | null;
    thumbMd?: string | null;
    thumbLg?: string | null;
  };
  pool:
    | { kind: "documents"; folderId: string }
    | { kind: "media"; albumId: string };
};

export async function confirmUpload(
  input: ConfirmUploadInput
): Promise<FileRecord> {
  await requireServerPermission({ all: ["asset:create"] });

  // Defense in depth: the Media pool only accepts renderable images/videos.
  // The browser uploader enforces the same rule but a handcrafted client
  // must not be able to sneak a PDF into an album.
  if (input.pool.kind === "media" && !isMediaAllowed(input.mimeType)) {
    throw new Error(
      `Media pool does not accept mime type "${input.mimeType}". Only images and videos are allowed.`
    );
  }

  // Verify the client actually PUT every declared variant — otherwise a
  // malicious client could fabricate DB records pointing at nothing.
  const verify = [input.keys.original];
  if (input.keys.thumbSm) verify.push(input.keys.thumbSm);
  if (input.keys.thumbMd) verify.push(input.keys.thumbMd);
  if (input.keys.thumbLg) verify.push(input.keys.thumbLg);
  const exists = await Promise.all(verify.map((k) => headObject(k)));
  if (exists.some((v) => !v)) {
    throw new Error("Upload verification failed: one or more objects missing");
  }

  const db = await getDbService();
  const created = await db.createFile({
    uuid: input.uuid,
    kind: input.kind,
    originalFilename: input.originalFilename,
    altText: input.altText ?? null,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    s3Key: input.keys.original,
    thumbSmKey: input.keys.thumbSm ?? null,
    thumbMdKey: input.keys.thumbMd ?? null,
    thumbLgKey: input.keys.thumbLg ?? null,
    width: input.width ?? null,
    height: input.height ?? null,
    blurhash: input.blurhash ?? null,
    pool: input.pool,
  });
  return enrichFileRecord(created);
}

// ── Files ──────────────────────────────────────────────────────────────

export async function getFile(fileId: string): Promise<FileRecord | null> {
  await requireServerPermission({ all: ["asset:read"] });
  const db = await getDbService();
  const file = await db.getFile(fileId);
  return file ? enrichFileRecord(file) : null;
}

export async function updateFile(
  fileId: string,
  patch: UpdateFilePatch
): Promise<void> {
  await requireServerPermission({ all: ["asset:update"] });
  const db = await getDbService();
  await db.updateFile(fileId, patch);
}

export type ReplaceFilePayload = {
  mimeType: string;
  sizeBytes: number;
  kind: FileKind;
  width?: number | null;
  height?: number | null;
  blurhash?: string | null;
  keys: {
    original: string;
    thumbSm?: string | null;
    thumbMd?: string | null;
    thumbLg?: string | null;
  };
};

export async function replaceFile(
  fileId: string,
  input: ReplaceFilePayload
): Promise<FileRecord> {
  await requireServerPermission({ all: ["asset:update"] });
  const db = await getDbService();
  const current = await db.getFile(fileId);
  if (!current) throw new Error("File not found");
  if (current.kind !== input.kind) {
    throw new Error(
      `Replace blocked: cannot change kind from ${current.kind} to ${input.kind}`
    );
  }

  const verify = [input.keys.original];
  if (input.keys.thumbSm) verify.push(input.keys.thumbSm);
  if (input.keys.thumbMd) verify.push(input.keys.thumbMd);
  if (input.keys.thumbLg) verify.push(input.keys.thumbLg);
  const exists = await Promise.all(verify.map((k) => headObject(k)));
  if (exists.some((v) => !v)) {
    throw new Error("Replace verification failed: one or more objects missing");
  }

  const previousKeys = [
    current.s3Key,
    ...(current.thumbSmKey ? [current.thumbSmKey] : []),
    ...(current.thumbMdKey ? [current.thumbMdKey] : []),
    ...(current.thumbLgKey ? [current.thumbLgKey] : []),
  ];

  await db.replaceFile(fileId, {
    s3Key: input.keys.original,
    thumbSmKey: input.keys.thumbSm ?? null,
    thumbMdKey: input.keys.thumbMd ?? null,
    thumbLgKey: input.keys.thumbLg ?? null,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    width: input.width ?? null,
    height: input.height ?? null,
    blurhash: input.blurhash ?? null,
    previousKeys,
  });

  // Best effort — if this throws, the DB row is already updated and the old
  // objects simply become orphans for the GC pass. We do not block the user.
  try {
    await deleteObjects(previousKeys);
  } catch (err) {
    console.error("Failed to delete replaced file objects", err);
  }

  const updated = await db.getFile(fileId);
  if (!updated) throw new Error("File disappeared mid-replace");
  return enrichFileRecord(updated);
}

export async function deleteFile(fileId: string): Promise<DeleteFileResult> {
  await requireServerPermission({ all: ["asset:delete"] });
  const db = await getDbService();
  const current = await db.getFile(fileId);
  const result = await db.deleteFile(fileId);
  if (result.status === "deleted" && current) {
    const keys = [
      current.s3Key,
      ...(current.thumbSmKey ? [current.thumbSmKey] : []),
      ...(current.thumbMdKey ? [current.thumbMdKey] : []),
      ...(current.thumbLgKey ? [current.thumbLgKey] : []),
    ];
    try {
      await deleteObjects(keys);
    } catch (err) {
      console.error("Failed to delete file objects", err);
    }
  }
  return result;
}

export async function bulkDeleteFiles(
  fileIds: string[]
): Promise<BulkDeleteResult> {
  await requireServerPermission({ all: ["asset:delete"] });
  const db = await getDbService();

  const existing = await Promise.all(fileIds.map((id) => db.getFile(id)));
  const byId = new Map(
    existing.filter((f): f is FileRecord => !!f).map((f) => [f.id, f])
  );

  const result = await db.bulkDeleteFiles(fileIds);
  const keys: string[] = [];
  for (const id of result.deleted) {
    const f = byId.get(id);
    if (!f) continue;
    keys.push(f.s3Key);
    if (f.thumbSmKey) keys.push(f.thumbSmKey);
    if (f.thumbMdKey) keys.push(f.thumbMdKey);
    if (f.thumbLgKey) keys.push(f.thumbLgKey);
  }
  try {
    await deleteObjects(keys);
  } catch (err) {
    console.error("Failed to delete bulk file objects", err);
  }
  return result;
}

export async function searchFiles(q: SearchQuery): Promise<FileRecord[]> {
  await requireServerPermission({ all: ["asset:read"] });
  const db = await getDbService();
  return enrichFileRecords(await db.searchFiles(q));
}

export async function getFileReferences(
  fileId: string
): Promise<Reference[]> {
  await requireServerPermission({ all: ["asset:read"] });
  const db = await getDbService();
  return db.findFileReferencesInPuckData(fileId);
}

// ── Documents pool ─────────────────────────────────────────────────────

export async function getFolderTree(): Promise<FolderRecord[]> {
  await requireServerPermission({ all: ["asset:read"] });
  const db = await getDbService();
  return db.getFolderTree();
}

export async function createFolder(
  input: CreateFolderInput
): Promise<FolderRecord> {
  await requireServerPermission({ all: ["asset:update"] });
  const db = await getDbService();
  return db.createFolder(input);
}

export async function updateFolder(
  folderId: string,
  patch: UpdateFolderPatch
): Promise<void> {
  await requireServerPermission({ all: ["asset:update"] });
  const db = await getDbService();
  await db.updateFolder(folderId, patch);
}

export async function deleteFolder(folderId: string): Promise<void> {
  await requireServerPermission({ all: ["asset:delete"] });
  const db = await getDbService();
  await db.deleteFolder(folderId);
}

export async function previewCascadeDeleteFolder(
  folderId: string
): Promise<CascadeDeletePreview> {
  await requireServerPermission({ all: ["asset:delete"] });
  const db = await getDbService();
  return db.previewCascadeDeleteFolder(folderId);
}

export async function cascadeDeleteFolder(
  folderId: string
): Promise<CascadeDeleteResult> {
  await requireServerPermission({ all: ["asset:delete"] });
  const db = await getDbService();
  const result = await db.cascadeDeleteFolder(folderId);
  if (result.blocked.length === 0 && result.s3Keys.length > 0) {
    // Mirror the pattern used by deleteFile/bulkDeleteFiles: best-effort
    // S3 cleanup after the DB commit. Failures here leave orphans for the
    // next GC pass but never roll the DB back.
    try {
      await deleteObjects(result.s3Keys);
    } catch (err) {
      console.error("Failed to delete cascade s3 objects", err);
    }
  }
  return result;
}

export async function listFolderFiles(
  folderId: string,
  page: PageArgs
): Promise<FileRecord[]> {
  await requireServerPermission({ all: ["asset:read"] });
  const db = await getDbService();
  return enrichFileRecords(await db.listFolderFiles(folderId, page));
}

export async function moveFilesToFolder(
  fileIds: string[],
  targetFolderId: string
): Promise<void> {
  await requireServerPermission({ all: ["asset:update"] });
  const db = await getDbService();
  await db.moveFilesToFolder(fileIds, targetFolderId);
}

// ── Media pool ─────────────────────────────────────────────────────────

export async function getCollectionTree(): Promise<CollectionRecord[]> {
  await requireServerPermission({ all: ["asset:read"] });
  const db = await getDbService();
  return db.getCollectionTree();
}

export async function createCollection(
  input: CreateCollectionInput
): Promise<CollectionRecord> {
  await requireServerPermission({ all: ["asset:update"] });
  const db = await getDbService();
  return db.createCollection(input);
}

export async function updateCollection(
  collectionId: string,
  patch: UpdateCollectionPatch
): Promise<void> {
  await requireServerPermission({ all: ["asset:update"] });
  const db = await getDbService();
  await db.updateCollection(collectionId, patch);
}

export async function deleteCollection(collectionId: string): Promise<void> {
  await requireServerPermission({ all: ["asset:delete"] });
  const db = await getDbService();
  await db.deleteCollection(collectionId);
}

export async function listCollectionFiles(
  collectionId: string,
  page: PageArgs
): Promise<FileRecord[]> {
  await requireServerPermission({ all: ["asset:read"] });
  const db = await getDbService();
  return enrichFileRecords(await db.listCollectionFiles(collectionId, page));
}

export async function addFilesToAlbum(
  fileIds: string[],
  targetAlbumId: string
): Promise<void> {
  await requireServerPermission({ all: ["asset:update"] });
  const db = await getDbService();
  await db.addFilesToAlbum(fileIds, targetAlbumId);
}

export async function removeFilesFromAlbum(
  fileIds: string[],
  sourceAlbumId: string
): Promise<RemoveFromAlbumResult> {
  await requireServerPermission({ all: ["asset:update"] });
  const db = await getDbService();
  return db.removeFilesFromAlbum(fileIds, sourceAlbumId);
}

export async function getAlbumFileCounts(): Promise<Record<string, number>> {
  await requireServerPermission({ all: ["asset:read"] });
  const db = await getDbService();
  return db.getAlbumFileCounts();
}

export async function getFileAlbumCount(fileId: string): Promise<number> {
  await requireServerPermission({ all: ["asset:read"] });
  const db = await getDbService();
  return db.getFileAlbumCount(fileId);
}

// ── Combined tree ──────────────────────────────────────────────────────

export async function getTree(): Promise<{
  folders: FolderRecord[];
  collections: CollectionRecord[];
}> {
  await requireServerPermission({ all: ["asset:read"] });
  const db = await getDbService();
  const [folders, collections] = await Promise.all([
    db.getFolderTree(),
    db.getCollectionTree(),
  ]);
  return { folders, collections };
}

// ── URL helper ─────────────────────────────────────────────────────────

/**
 * Mint a presigned read URL for an arbitrary S3 key. Only used by a handful
 * of client flows (e.g. the upload UI needs a signed URL for a key it just
 * PUT but doesn't yet have a `FileRecord` for). For normal rendering, use
 * `file.signedUrl` from an enriched `FileRecord`.
 */
export async function getSignedFileUrl(key: string): Promise<string> {
  await requireServerPermission({ all: ["asset:read"] });
  return signedReadUrl(key);
}

// ── Orphan GC ──────────────────────────────────────────────────────────

export type OrphanGcResult = {
  deletedFileRecords: number;
  deletedS3Keys: number;
};

/**
 * Preview of which file records would be deleted by `runOrphanGc`.
 */
export async function previewOrphanGc(): Promise<FileRecord[]> {
  await requireServerPermission({ all: ["asset:delete"] });
  const db = await getDbService();
  return enrichFileRecords(await db.findOrphanFiles());
}

/**
 * Manual orphan GC. v1 scans for DB-side orphans only — file records that
 * fell out of both pools. Bucket-side orphan detection (objects PUT but
 * never confirmed) is deferred; it needs ListObjectsV2 and can handle
 * arbitrarily large buckets, but it's not blocking.
 *
 * Each orphan goes through `deleteFile` so puck-data reference scans still
 * protect against accidental deletion of something a page still uses.
 */
export async function runOrphanGc(): Promise<OrphanGcResult> {
  await requireServerPermission({ all: ["asset:delete"] });
  const db = await getDbService();
  const orphans = await db.findOrphanFiles();
  const keys: string[] = [];
  let recordCount = 0;
  for (const orphan of orphans) {
    const result = await db.deleteFile(orphan.id);
    if (result.status === "deleted") {
      recordCount += 1;
      keys.push(orphan.s3Key);
      if (orphan.thumbSmKey) keys.push(orphan.thumbSmKey);
      if (orphan.thumbMdKey) keys.push(orphan.thumbMdKey);
    }
  }
  try {
    await deleteObjects(keys);
  } catch (err) {
    console.error("GC delete failed", err);
  }
  return { deletedFileRecords: recordCount, deletedS3Keys: keys.length };
}

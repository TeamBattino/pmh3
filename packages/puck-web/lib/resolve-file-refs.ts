import type {
  DocumentRef,
  MediaRef,
} from "../fields/file-picker-context";

/**
 * Minimum shape `resolveFileRefs` needs from the admin's `DatabaseService`.
 * We avoid importing the full interface so puck-web stays dependency-free
 * of the admin app.
 */
export type FileResolverDb = {
  getFile: (id: string) => Promise<FileRecordLike | null>;
  resolveCollectionRef: (collectionId: string) => Promise<string[]>;
};

export type FileRecordLike = {
  id: string;
  s3Key: string;
  thumbSmKey: string | null;
  thumbMdKey: string | null;
  thumbLgKey: string | null;
  originalFilename: string;
  altText: string | null;
  mimeType: string;
  kind: "image" | "video" | "document";
  width: number | null;
  height: number | null;
  blurhash: string | null;
  /**
   * Presigned read URLs populated by the caller's `db.getFile` before
   * reaching the renderer. Components build their `<img src>` / `<a href>`
   * directly from these fields.
   */
  signedUrl?: string;
  signedThumbSmUrl?: string | null;
  signedThumbMdUrl?: string | null;
  signedThumbLgUrl?: string | null;
};

export type AnyFileRef = MediaRef | DocumentRef;

/**
 * Resolve a batch of file refs to concrete `FileRecord`s. `type: 'collection'`
 * refs expand to every file currently in the album, in membership order.
 *
 * Used once per page on the site side so component render doesn't do N+1
 * database lookups.
 */
export async function resolveFileRefs(
  refs: AnyFileRef[],
  db: FileResolverDb
): Promise<FileRecordLike[]> {
  const fileIds: string[] = [];
  const seen = new Set<string>();
  for (const ref of refs) {
    if (ref.type === "file") {
      if (!seen.has(ref.fileId)) {
        seen.add(ref.fileId);
        fileIds.push(ref.fileId);
      }
      continue;
    }
    const ids = await db.resolveCollectionRef(ref.collectionId);
    for (const id of ids) {
      if (!seen.has(id)) {
        seen.add(id);
        fileIds.push(id);
      }
    }
  }

  const records = await Promise.all(fileIds.map((id) => db.getFile(id)));
  return records.filter((r): r is FileRecordLike => !!r);
}

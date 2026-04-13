/**
 * Pure-type module for file picker refs, with no React imports. Server
 * components (and server-evaluated config modules like `page.config.ts`) can
 * import these without pulling in `createContext` / `useContext` from the
 * client-only `file-picker-context.tsx`.
 */

/**
 * Requested variant for file URL resolution. Falls back to the next
 * available larger variant when the requested one is missing.
 *   - "sm"       → small (~200px) thumbnail.
 *   - "md"       → medium (~800px) thumbnail.
 *   - "lg"       → large (~1600px) thumbnail.
 *   - "original" → raw uploaded file.
 */
export type FileSize = "sm" | "md" | "lg" | "original";

export type FileUrlResolver = (
  fileId: string,
  size: FileSize
) => Promise<string | null>;

export type MediaRef =
  | { type: "file"; fileId: string }
  | { type: "collection"; collectionId: string };

export type DocumentRef = { type: "file"; fileId: string };

/**
 * File kind buckets, matching `FileRecord.kind` in the admin app. The media
 * picker filters by kind (coarse); the documents picker filters by mime type
 * (fine). Keeping the two vocabularies on distinct field names prevents
 * callers from passing `"image/png"` to a kind filter or `"image"` to a mime
 * filter and silently getting zero results.
 */
export type FileKind = "image" | "video" | "document";

export type PickerConfig =
  | {
      pool: "media";
      mode: "single" | "multi";
      /** Restrict the media picker to specific kinds, e.g. `["image"]`. */
      acceptKinds?: FileKind[];
      allowCollection?: boolean;
    }
  | {
      pool: "documents";
      mode: "single" | "multi";
      /** Restrict the documents picker to specific mime types. */
      acceptMimeTypes?: string[];
    };

export type PickerSelection =
  | { pool: "media"; refs: MediaRef[] }
  | { pool: "documents"; refs: DocumentRef[] };

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

/**
 * One resolved item inside an album. Returned by `AlbumResolver` for the
 * Gallery component. URLs are populated only for items the current request
 * is allowed to view (i.e. the file is unprotected, or the unlock cookie
 * is set). Locked items still include dimensions + blurhash so the
 * placeholder can render at the right aspect ratio.
 */
export type AlbumItem = {
  fileId: string;
  kind: "image" | "video";
  width: number | null;
  height: number | null;
  blurhash: string | null;
  alt: string | null;
  /** Whether *this specific item* is gated for the current viewer. */
  locked: boolean;
  /** Signed image URLs (thumbnails). For videos these are the generated
   *  poster-frame thumbs, NOT the video file. Null for locked items. */
  urls: { sm: string | null; md: string | null; lg: string | null } | null;
  /** Signed video poster url — legacy fallback for old uploads. Null for
   *  images, null for new videos (which use `urls` instead). */
  posterUrl: string | null;
  /** Signed URL of the actual video binary. Null for images. Populated for
   *  videos even when the Gallery shows the still thumb, so the lightbox
   *  can play the clip without a second resolver round-trip. */
  videoUrl: string | null;
};

export type ResolvedAlbum = {
  collectionId: string;
  title: string;
  /** True when the album itself is password-protected. */
  passwordProtected: boolean;
  /** True iff the viewer has the unlock cookie set. */
  unlocked: boolean;
  items: AlbumItem[];
};

export type AlbumResolver = (
  collectionId: string
) => Promise<ResolvedAlbum | null>;

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
      /**
       * Album-only mode: hides the file grid pane entirely, leaving only
       * album-level selection in the sidebar. Implies `allowCollection: true`
       * and forbids file selection.
       */
      albumOnly?: boolean;
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

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

export type PickerConfig = {
  pool: "media" | "documents";
  mode: "single" | "multi";
  accept?: string[];
  allowCollection?: boolean;
};

export type PickerSelection =
  | { pool: "media"; refs: MediaRef[] }
  | { pool: "documents"; refs: DocumentRef[] };

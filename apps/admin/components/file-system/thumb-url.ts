import type { FileRecord } from "@/lib/db/file-system-types";

/**
 * Pick the best signed thumbnail URL for a file record. Falls back through
 * thumb_md → thumb_sm → original. Returns `""` if the record has no signed
 * URLs (unenriched record — should only happen for internal code paths).
 */
export function bestThumbnailUrl(file: FileRecord): string {
  return (
    file.signedThumbMdUrl ?? file.signedThumbSmUrl ?? file.signedUrl ?? ""
  );
}

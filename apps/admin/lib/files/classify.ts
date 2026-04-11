/**
 * Classify a browser `File` into one of our three kinds plus the set of
 * variants that should be generated client-side before upload.
 *
 * Pure function, no DOM access — so it can also be unit-tested under Node.
 */
export type FileKind = "image" | "video" | "document";

export type ClassifiedFile = {
  kind: FileKind;
  /** Which variants the client pipeline should produce. */
  generateThumbnails: boolean;
  computeBlurhash: boolean;
  /** True for SVG and animated GIF — pass through untouched. */
  passthroughImage: boolean;
};

export function classifyFile(
  mimeType: string,
  isAnimatedGif = false
): ClassifiedFile {
  const m = mimeType.toLowerCase();
  if (m === "image/svg+xml") {
    return {
      kind: "image",
      generateThumbnails: false,
      computeBlurhash: false,
      passthroughImage: true,
    };
  }
  if (m === "image/gif" && isAnimatedGif) {
    return {
      kind: "image",
      generateThumbnails: false,
      computeBlurhash: false,
      passthroughImage: true,
    };
  }
  if (m.startsWith("image/")) {
    return {
      kind: "image",
      generateThumbnails: true,
      computeBlurhash: true,
      passthroughImage: false,
    };
  }
  if (m.startsWith("video/")) {
    return {
      kind: "video",
      generateThumbnails: false,
      computeBlurhash: false,
      passthroughImage: false,
    };
  }
  return {
    kind: "document",
    generateThumbnails: false,
    computeBlurhash: false,
    passthroughImage: false,
  };
}

/**
 * Cheap heuristic for animated GIF detection. Scans the payload for the
 * `NETSCAPE2.0` extension block — the marker every animated GIF carries.
 * Accepts an `ArrayBuffer` so callers can reuse a single FileReader read.
 */
export function isAnimatedGifBuffer(buf: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buf);
  const marker = [
    0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30,
  ]; // "NETSCAPE2.0"
  outer: for (let i = 0; i <= bytes.length - marker.length; i++) {
    for (let j = 0; j < marker.length; j++) {
      if (bytes[i + j] !== marker[j]) continue outer;
    }
    return true;
  }
  return false;
}

/**
 * Derive a sensible filename extension from the mime type. Used when the
 * original filename has none.
 */
export function extensionFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "image/avif": "avif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "application/pdf": "pdf",
    "application/zip": "zip",
  };
  return map[mimeType.toLowerCase()] ?? "bin";
}

export function filenameExtension(filename: string): string | null {
  const ix = filename.lastIndexOf(".");
  if (ix < 0 || ix === filename.length - 1) return null;
  return filename.slice(ix + 1).toLowerCase();
}

/**
 * Whitelist of MIME types accepted by the Media pool. Restricted to formats
 * every modern browser can decode/play natively, so there are no "broken
 * preview" surprises in the gallery or on the public site. Documents pool
 * is deliberately unrestricted and uses none of this.
 */
const MEDIA_ALLOWED_MIME_TYPES = new Set<string>([
  // Raster + vector images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
  // Video — formats with broad native browser support
  "video/mp4",
  "video/webm",
  "video/ogg",
]);

export function isMediaAllowed(mimeType: string | undefined | null): boolean {
  if (!mimeType) return false;
  return MEDIA_ALLOWED_MIME_TYPES.has(mimeType.toLowerCase());
}

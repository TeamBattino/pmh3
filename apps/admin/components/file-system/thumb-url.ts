/**
 * Build public URLs from `s3Key` values at render time. The client reads
 * `NEXT_PUBLIC_S3_PUBLIC_URL_BASE` from a `<meta>` tag emitted by the admin
 * layout — we avoid exposing it via the `env.ts` `client` block because we
 * only need the base on the client side of a handful of views.
 *
 * Fallback: if no meta tag is present, emit the key unchanged so the
 * browser gracefully 404s instead of crashing the tree.
 */

let cachedBase: string | null = null;

function getBase(): string {
  if (cachedBase !== null) return cachedBase;
  if (typeof document === "undefined") {
    cachedBase = "";
    return cachedBase;
  }
  const el = document.querySelector<HTMLMetaElement>(
    'meta[name="pfadipuck-s3-public-url-base"]'
  );
  cachedBase = (el?.content ?? "").replace(/\/+$/, "");
  return cachedBase;
}

export function publicUrlFor(key: string | null | undefined): string {
  if (!key) return "";
  const base = getBase();
  const k = key.replace(/^\/+/, "");
  return base ? `${base}/${k}` : k;
}

/**
 * Return the best thumbnail URL for a file record. Falls back through
 * thumb_md → thumb_sm → original.
 */
export function bestThumbnailKey(file: {
  thumbMdKey: string | null;
  thumbSmKey: string | null;
  s3Key: string;
}): string {
  return file.thumbMdKey || file.thumbSmKey || file.s3Key;
}

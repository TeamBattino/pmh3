import { encode as encodeBlurhash } from "blurhash";
import {
  classifyFile,
  extensionFromMime,
  filenameExtension,
  isAnimatedGifBuffer,
  type FileKind,
} from "./classify";
import { xhrPut } from "./xhr-put";
import {
  confirmUpload,
  presignUpload,
  type PresignUploadVariant,
} from "@/lib/db/file-system-actions";
import type { FileRecord } from "@/lib/db/file-system-types";

/**
 * Browser-side file processing and upload pipeline. Runs entirely in the
 * client — the server never touches file bytes.
 *
 * Steps per file:
 *   1. Classify by MIME (with an animated-GIF probe).
 *   2. For raster images: generate WebP thumbnails (200/800 px) + a blurhash.
 *   3. Presign PUT URLs via server action.
 *   4. PUT the original + variants directly to S3 via XHR.
 *   5. Confirm via server action — the server HEADs each key before writing
 *      the DB row.
 */

export type UploadPool =
  | { kind: "documents"; folderId: string }
  | { kind: "media"; albumId: string };

export type ProgressReport = {
  /** Weighted overall percent 0-100. */
  percent: number;
  phase: "processing" | "uploading" | "confirming" | "done";
};

export type ProcessedFile = {
  kind: FileKind;
  original: { blob: Blob; contentType: string; keySuffix: string };
  thumbSm?: { blob: Blob; contentType: string; keySuffix: string };
  thumbMd?: { blob: Blob; contentType: string; keySuffix: string };
  thumbLg?: { blob: Blob; contentType: string; keySuffix: string };
  width: number | null;
  height: number | null;
  blurhash: string | null;
  originalFilename: string;
  sizeBytes: number;
  mimeType: string;
};

// Weighted progress across variants — original dominates. Matches the plan.
const WEIGHT_ORIGINAL = 0.9;
const WEIGHT_THUMB = 0.05;

export async function processFileForUpload(
  file: File
): Promise<ProcessedFile> {
  const mimeType = file.type || "application/octet-stream";
  const ext =
    filenameExtension(file.name) ?? extensionFromMime(mimeType);

  let animated = false;
  if (mimeType.toLowerCase() === "image/gif") {
    try {
      const buf = await file.arrayBuffer();
      animated = isAnimatedGifBuffer(buf);
    } catch {
      // If we can't read the buffer, assume animated to stay safe.
      animated = true;
    }
  }

  const cls = classifyFile(mimeType, animated);
  const base: ProcessedFile = {
    kind: cls.kind,
    original: {
      blob: file,
      contentType: mimeType,
      keySuffix: `.${ext}`,
    },
    width: null,
    height: null,
    blurhash: null,
    originalFilename: file.name,
    sizeBytes: file.size,
    mimeType,
  };

  // Video uploads: extract a poster frame in-browser using HTMLVideoElement +
  // canvas, then feed that frame through the same thumbnail + blurhash
  // pipeline we use for raster images. Videos end up with thumbSm/Md/Lg
  // plus a blurhash; we no longer produce a separate `_poster.webp` since
  // `thumbLg` covers that role. Failure is non-fatal — the gallery falls
  // back to a plain play-icon tile.
  if (cls.kind === "video") {
    try {
      const extracted = await extractVideoPoster(file);
      base.width = extracted.videoWidth;
      base.height = extracted.videoHeight;
      const loaded = await loadImageFromBlob(extracted.blob);
      try {
        const [thumbSm, thumbMd, thumbLg] = await Promise.all([
          canvasResizeToWebp(loaded.image, 200, 0.8),
          canvasResizeToWebp(loaded.image, 800, 0.85),
          canvasResizeToWebp(loaded.image, 1600, 0.85),
        ]);
        base.thumbSm = {
          blob: thumbSm,
          contentType: "image/webp",
          keySuffix: `_thumb_sm.webp`,
        };
        base.thumbMd = {
          blob: thumbMd,
          contentType: "image/webp",
          keySuffix: `_thumb_md.webp`,
        };
        base.thumbLg = {
          blob: thumbLg,
          contentType: "image/webp",
          keySuffix: `_thumb_lg.webp`,
        };
        base.blurhash = computeBlurhash(loaded.image);
      } finally {
        loaded.cleanup();
      }
    } catch (err) {
      console.warn("Video poster extraction failed", err);
    }
    return base;
  }

  if (!cls.generateThumbnails) return base;

  // Raster image path — generate thumbnails + blurhash from a single load.
  const loaded = await loadImageFromBlob(file);
  try {
    base.width = loaded.width;
    base.height = loaded.height;

    const [thumbSm, thumbMd, thumbLg] = await Promise.all([
      canvasResizeToWebp(loaded.image, 200, 0.8),
      canvasResizeToWebp(loaded.image, 800, 0.85),
      canvasResizeToWebp(loaded.image, 1600, 0.85),
    ]);
    base.thumbSm = {
      blob: thumbSm,
      contentType: "image/webp",
      keySuffix: `_thumb_sm.webp`,
    };
    base.thumbMd = {
      blob: thumbMd,
      contentType: "image/webp",
      keySuffix: `_thumb_md.webp`,
    };
    base.thumbLg = {
      blob: thumbLg,
      contentType: "image/webp",
      keySuffix: `_thumb_lg.webp`,
    };

    if (cls.computeBlurhash) {
      base.blurhash = computeBlurhash(loaded.image);
    }
  } finally {
    loaded.cleanup();
  }

  return base;
}

export async function uploadProcessedFile(
  processed: ProcessedFile,
  pool: UploadPool,
  {
    onProgress,
    signal,
  }: {
    onProgress?: (p: ProgressReport) => void;
    signal?: AbortSignal;
  } = {}
): Promise<FileRecord> {
  const variants: PresignUploadVariant[] = [
    {
      variant: "original",
      contentType: processed.original.contentType,
      keySuffix: processed.original.keySuffix,
    },
  ];
  if (processed.thumbSm)
    variants.push({
      variant: "thumb_sm",
      contentType: processed.thumbSm.contentType,
      keySuffix: processed.thumbSm.keySuffix,
    });
  if (processed.thumbMd)
    variants.push({
      variant: "thumb_md",
      contentType: processed.thumbMd.contentType,
      keySuffix: processed.thumbMd.keySuffix,
    });
  if (processed.thumbLg)
    variants.push({
      variant: "thumb_lg",
      contentType: processed.thumbLg.contentType,
      keySuffix: processed.thumbLg.keySuffix,
    });
  onProgress?.({ percent: 0, phase: "uploading" });

  const presigned = await presignUpload({ variants });
  const byVariant = new Map(presigned.uploads.map((u) => [u.variant, u]));

  const weights = new Map<string, number>();
  weights.set("original", WEIGHT_ORIGINAL);
  if (processed.thumbSm) weights.set("thumb_sm", WEIGHT_THUMB);
  if (processed.thumbMd) weights.set("thumb_md", WEIGHT_THUMB);
  if (processed.thumbLg) weights.set("thumb_lg", WEIGHT_THUMB);
  // Normalize so weights sum to 1 (non-image uploads skip thumbs entirely).
  const totalWeight = [...weights.values()].reduce((a, b) => a + b, 0);
  for (const [k, v] of weights) weights.set(k, v / totalWeight);

  const progressByVariant = new Map<string, number>();

  const bumpProgress = () => {
    let pct = 0;
    for (const [variant, weight] of weights) {
      pct += (progressByVariant.get(variant) ?? 0) * weight;
    }
    onProgress?.({ percent: Math.round(pct), phase: "uploading" });
  };

  const puts: Array<Promise<void>> = [];
  for (const [variantKey, data] of [
    ["original", processed.original] as const,
    ...(processed.thumbSm
      ? [["thumb_sm", processed.thumbSm] as const]
      : []),
    ...(processed.thumbMd
      ? [["thumb_md", processed.thumbMd] as const]
      : []),
    ...(processed.thumbLg
      ? [["thumb_lg", processed.thumbLg] as const]
      : []),
  ]) {
    const upload = byVariant.get(variantKey);
    if (!upload) continue;
    puts.push(
      xhrPut({
        url: upload.presignedUrl,
        blob: data.blob,
        contentType: data.contentType,
        signal,
        onProgress: (p) => {
          progressByVariant.set(variantKey, p);
          bumpProgress();
        },
      })
    );
  }
  await Promise.all(puts);

  onProgress?.({ percent: 100, phase: "confirming" });

  const original = byVariant.get("original")!;
  const record = await confirmUpload({
    uuid: presigned.uuid,
    originalFilename: processed.originalFilename,
    mimeType: processed.mimeType,
    sizeBytes: processed.sizeBytes,
    kind: processed.kind,
    width: processed.width,
    height: processed.height,
    blurhash: processed.blurhash,
    keys: {
      original: original.key,
      thumbSm: byVariant.get("thumb_sm")?.key ?? null,
      thumbMd: byVariant.get("thumb_md")?.key ?? null,
      thumbLg: byVariant.get("thumb_lg")?.key ?? null,
      poster: null,
    },
    pool,
  });

  onProgress?.({ percent: 100, phase: "done" });
  return record;
}

// ── Image processing helpers ───────────────────────────────────────────

type LoadedImage = {
  image: HTMLImageElement;
  width: number;
  height: number;
  cleanup: () => void;
};

async function loadImageFromBlob(blob: Blob): Promise<LoadedImage> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Failed to decode image"));
      el.src = url;
    });
    return {
      image: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      cleanup: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

function canvasResizeToWebp(
  img: HTMLImageElement,
  longestSide: number,
  quality: number
): Promise<Blob> {
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  const ratio = Math.min(1, longestSide / Math.max(srcW, srcH));
  const targetW = Math.max(1, Math.round(srcW * ratio));
  const targetH = Math.max(1, Math.round(srcH * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D canvas context");
  ctx.drawImage(img, 0, 0, targetW, targetH);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Canvas toBlob failed"));
      },
      "image/webp",
      quality
    );
  });
}

function computeBlurhash(img: HTMLImageElement): string {
  const W = 32;
  const H = 32;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D canvas context");
  ctx.drawImage(img, 0, 0, W, H);
  const { data } = ctx.getImageData(0, 0, W, H);
  return encodeBlurhash(data, W, H, 4, 3);
}

/**
 * Extract a single poster frame from a video file via HTMLVideoElement +
 * canvas. Seeks near the start and snapshots to WebP at up to 1600px on
 * the longest side — large enough to feed the image thumbnail pipeline.
 *
 * Returns the encoded blob plus the video's native dimensions (not the
 * poster's — the FileRecord stores the real video resolution). Browsers
 * only succeed for codecs they can decode (mp4/h264, webm/vp9 etc.);
 * exotic formats throw and the upload proceeds without thumbs.
 */
async function extractVideoPoster(
  blob: Blob
): Promise<{ blob: Blob; videoWidth: number; videoHeight: number }> {
  const url = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      video.addEventListener("loadeddata", () => resolve(), { once: true });
      video.addEventListener(
        "error",
        () => reject(new Error("Video metadata failed to load")),
        { once: true }
      );
    });

    const target = Math.min(1, Math.max(0.05, (video.duration || 1) * 0.1));
    await new Promise<void>((resolve, reject) => {
      video.addEventListener("seeked", () => resolve(), { once: true });
      video.addEventListener(
        "error",
        () => reject(new Error("Video seek failed")),
        { once: true }
      );
      video.currentTime = target;
    });

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) throw new Error("Video has no dimensions");

    // Encode the poster at a size large enough for thumbLg (1600px) to
    // downsample from. Larger than 1600 just wastes decode time.
    const longest = 1600;
    const ratio = Math.min(1, longest / Math.max(w, h));
    const pw = Math.max(1, Math.round(w * ratio));
    const ph = Math.max(1, Math.round(h * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = pw;
    canvas.height = ph;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2D canvas context");
    ctx.drawImage(video, 0, 0, pw, ph);

    const posterBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        "image/webp",
        0.9
      );
    });

    return { blob: posterBlob, videoWidth: w, videoHeight: h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

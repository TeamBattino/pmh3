"use client";

import { decode as decodeBlurhash } from "blurhash";
import { FileText, FileVideo, FileArchive, FileIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { FileRecord } from "@/lib/db/file-system-types";
import { bestThumbnailKey, publicUrlFor } from "./thumb-url";

/**
 * Visual tile for a file. Shows a lazy `<img>` for raster/SVG images (with a
 * blurhash placeholder), or a lucide icon for videos/documents.
 *
 * Selection is opt-in: pass `selected` + `onSelectChange` to enable the
 * checkbox. The tile is clickable via `onOpen` for the detail sheet.
 */
export type FileCardProps = {
  file: FileRecord;
  selected?: boolean;
  onSelectChange?: (next: boolean) => void;
  onOpen?: (file: FileRecord) => void;
  className?: string;
  /** True when any tile in the parent view is selected — forces checkbox visible. */
  anySelected?: boolean;
  /**
   * When true, a plain tile click toggles selection instead of opening the
   * detail sheet. Parents set this once the user has entered selection
   * mode (usually `selection.size > 0`).
   */
  selectionMode?: boolean;
};

export function FileCard({
  file,
  selected,
  onSelectChange,
  onOpen,
  anySelected,
  selectionMode,
  className,
}: FileCardProps) {
  const showCheckbox = anySelected || !!selected;
  const isImage = file.kind === "image";
  const thumbUrl = isImage ? publicUrlFor(bestThumbnailKey(file)) : "";

  const handleActivate = () => {
    if (selectionMode && onSelectChange) {
      onSelectChange(!selected);
      return;
    }
    onOpen?.(file);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={file.originalFilename}
      aria-pressed={selectionMode ? !!selected : undefined}
      onClick={handleActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleActivate();
        }
      }}
      className={cn(
        "group relative flex aspect-square w-full cursor-pointer flex-col overflow-hidden rounded-md border border-border bg-muted transition-colors hover:border-primary",
        selected && "ring-2 ring-primary",
        className
      )}
    >
      {onSelectChange && (
        <label
          className={cn(
            "absolute left-2 top-2 z-10 flex size-5 items-center justify-center rounded border border-border bg-background/80 opacity-0 transition-opacity",
            (showCheckbox || selected) && "opacity-100",
            "group-hover:opacity-100"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={!!selected}
            onChange={(e) => onSelectChange(e.target.checked)}
            className="size-3 accent-primary"
            aria-label={`Select ${file.originalFilename}`}
          />
        </label>
      )}

      <div className="relative flex-1">
        {isImage ? (
          <ImageWithBlurhash
            src={thumbUrl}
            alt={file.altText ?? file.originalFilename}
            blurhash={file.blurhash}
            width={file.width}
            height={file.height}
          />
        ) : (
          <IconPreview kind={file.kind} mimeType={file.mimeType} />
        )}
      </div>
      <div className="truncate border-t border-border bg-background px-2 py-1 text-xs">
        {file.originalFilename}
      </div>
    </div>
  );
}

function ImageWithBlurhash({
  src,
  alt,
  blurhash,
  width,
  height,
}: {
  src: string;
  alt: string;
  blurhash: string | null;
  width: number | null;
  height: number | null;
}) {
  const [loaded, setLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!blurhash || !canvasRef.current) return;
    try {
      const pixels = decodeBlurhash(blurhash, 32, 32);
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;
      const imageData = ctx.createImageData(32, 32);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);
    } catch {
      // Bad blurhash — just skip; the loading shimmer is acceptable.
    }
  }, [blurhash]);

  return (
    <div className="relative size-full bg-muted">
      {blurhash && !loaded && (
        <canvas
          ref={canvasRef}
          width={32}
          height={32}
          className="absolute inset-0 size-full blur-xl"
          aria-hidden
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={width ?? undefined}
        height={height ?? undefined}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={cn(
          "absolute inset-0 size-full object-cover transition-opacity",
          loaded ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}

function IconPreview({
  kind,
  mimeType,
}: {
  kind: "image" | "video" | "document";
  mimeType: string;
}) {
  const Icon = useMemo(() => {
    if (kind === "video") return FileVideo;
    if (mimeType === "application/zip") return FileArchive;
    if (mimeType === "application/pdf") return FileText;
    if (kind === "document") return FileText;
    return FileIcon;
  }, [kind, mimeType]);
  return (
    <div className="flex size-full items-center justify-center text-muted-foreground">
      <Icon className="size-12" aria-hidden />
    </div>
  );
}

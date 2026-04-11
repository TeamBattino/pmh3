"use client";

import { Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { CollectionRecord } from "@/lib/db/file-system-types";
import { useFile } from "@/lib/files/file-system-hooks";
import { bestThumbnailKey, publicUrlFor } from "@/components/file-system/thumb-url";

export function AlbumCard({
  album,
  fileCount,
  href,
  className,
}: {
  album: CollectionRecord;
  fileCount: number;
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col overflow-hidden rounded-md border border-border bg-card transition-colors hover:border-admin-primary",
        className
      )}
    >
      <AlbumCover coverFileId={album.coverFileId} />
      <div className="flex flex-col gap-0.5 border-t border-border px-3 py-2">
        <div className="truncate text-sm font-medium">{album.title}</div>
        <div className="text-xs text-muted-foreground">
          {fileCount} file{fileCount === 1 ? "" : "s"}
        </div>
      </div>
    </Link>
  );
}

function AlbumCover({ coverFileId }: { coverFileId: string | null }) {
  // `useFile(null)` is disabled by the hook itself, so this short-circuits
  // cleanly when no cover is set.
  const { data: file } = useFile(coverFileId);
  if (file && file.kind === "image") {
    return (
      <div className="aspect-square w-full overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={publicUrlFor(bestThumbnailKey(file))}
          alt={file.altText ?? file.originalFilename}
          className="size-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }
  return (
    <div className="flex aspect-square items-center justify-center bg-muted text-muted-foreground">
      <ImageIcon className="size-10" aria-hidden />
    </div>
  );
}

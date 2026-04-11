"use client";

import { FolderHeart } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { CollectionRecord } from "@/lib/db/file-system-types";
import { useFile } from "@/lib/files/file-system-hooks";
import { bestThumbnailKey, publicUrlFor } from "@/components/file-system/thumb-url";

/**
 * Landing tile for an album collection. Renders the collection's cover
 * image if one is set; otherwise shows a placeholder icon.
 */
export function CollectionCard({
  collection,
  albumCount,
  href,
  className,
}: {
  collection: CollectionRecord;
  albumCount: number;
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col overflow-hidden rounded-md border border-border bg-card transition-colors hover:border-primary",
        className
      )}
    >
      <CollectionCover coverFileId={collection.coverFileId} />
      <div className="flex flex-col gap-0.5 border-t border-border px-3 py-2">
        <div className="truncate font-medium">{collection.title}</div>
        <div className="text-xs text-muted-foreground">
          {albumCount} album{albumCount === 1 ? "" : "s"}
        </div>
      </div>
    </Link>
  );
}

function CollectionCover({ coverFileId }: { coverFileId: string | null }) {
  const { data: file } = useFile(coverFileId);
  if (file && file.kind === "image") {
    return (
      <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
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
    <div className="flex aspect-[4/3] items-center justify-center bg-muted text-muted-foreground">
      <FolderHeart className="size-12" aria-hidden />
    </div>
  );
}

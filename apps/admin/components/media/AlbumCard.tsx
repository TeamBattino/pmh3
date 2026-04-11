"use client";

import { Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { CollectionRecord } from "@/lib/db/file-system-types";

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
        "group flex flex-col overflow-hidden rounded-md border border-border bg-card transition-colors hover:border-primary",
        className
      )}
    >
      <div className="flex aspect-square items-center justify-center bg-muted text-muted-foreground">
        <ImageIcon className="size-10" aria-hidden />
      </div>
      <div className="flex flex-col gap-0.5 border-t border-border px-3 py-2">
        <div className="truncate text-sm font-medium">{album.title}</div>
        <div className="text-xs text-muted-foreground">
          {fileCount} file{fileCount === 1 ? "" : "s"}
        </div>
      </div>
    </Link>
  );
}

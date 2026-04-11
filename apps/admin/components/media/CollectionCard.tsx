"use client";

import { FolderHeart } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { CollectionRecord } from "@/lib/db/file-system-types";

/**
 * Landing tile for an album collection. Cover is a placeholder for v1 — the
 * plan keeps the `coverFileId` field but defers the UI for setting it.
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
      <div className="flex aspect-[4/3] items-center justify-center bg-muted text-muted-foreground">
        <FolderHeart className="size-12" aria-hidden />
      </div>
      <div className="flex flex-col gap-0.5 border-t border-border px-3 py-2">
        <div className="truncate font-medium">{collection.title}</div>
        <div className="text-xs text-muted-foreground">
          {albumCount} album{albumCount === 1 ? "" : "s"}
        </div>
      </div>
    </Link>
  );
}

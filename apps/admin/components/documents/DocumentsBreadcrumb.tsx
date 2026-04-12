"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/cn";
import type { FolderRecord } from "@/lib/db/file-system-types";
import { buildBreadcrumbChain } from "@/lib/files/folder-path";

/**
 * Breadcrumb that mirrors the URL. "Home" is always the first segment and
 * routes to `/documents`. On mobile the row scrolls horizontally so deep
 * paths stay reachable without wrapping.
 */
export function DocumentsBreadcrumb({
  folders,
  currentId,
}: {
  folders: FolderRecord[];
  currentId: string | null;
}) {
  const chain = currentId ? buildBreadcrumbChain(currentId, folders) : [];
  const lastIndex = chain.length - 1;

  return (
    <nav
      aria-label="Folder breadcrumb"
      className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap text-sm"
    >
      <Link
        href="/documents"
        className={cn(
          "flex shrink-0 items-center gap-1 rounded px-1.5 py-1 text-muted-foreground hover:bg-accent hover:text-foreground",
          currentId === null && "font-medium text-foreground"
        )}
      >
        <Home className="size-3.5" aria-hidden />
        <span>Home</span>
      </Link>
      {chain.map((seg, idx) => (
        <span key={seg.folder.id} className="flex shrink-0 items-center gap-1">
          <ChevronRight
            className="size-3 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <Link
            href={seg.href}
            className={cn(
              "rounded px-1.5 py-1 text-muted-foreground hover:bg-accent hover:text-foreground",
              idx === lastIndex && "font-medium text-foreground"
            )}
          >
            {seg.folder.name}
          </Link>
        </span>
      ))}
    </nav>
  );
}

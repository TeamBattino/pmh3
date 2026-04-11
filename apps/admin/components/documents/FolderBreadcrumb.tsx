"use client";

import { ChevronRight } from "lucide-react";
import type { FolderRecord } from "@/lib/db/file-system-types";

/**
 * Derive the breadcrumb chain from a folder's `ancestorIds`. Since the admin
 * UI holds the full tree in memory, we can build this without another query.
 */
export function FolderBreadcrumb({
  folders,
  currentId,
  onSelect,
}: {
  folders: FolderRecord[];
  currentId: string;
  onSelect: (id: string | null) => void;
}) {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const current = byId.get(currentId);
  if (!current) return null;
  const chain: FolderRecord[] = [];
  for (const ancestorId of current.ancestorIds) {
    const f = byId.get(ancestorId);
    if (f) chain.push(f);
  }
  chain.push(current);

  return (
    <nav aria-label="Folder breadcrumb" className="flex items-center gap-1 text-sm">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className="text-muted-foreground hover:text-foreground"
      >
        Documents
      </button>
      {chain.map((folder) => (
        <span key={folder.id} className="flex items-center gap-1">
          <ChevronRight className="size-3 text-muted-foreground" aria-hidden />
          <button
            type="button"
            onClick={() => onSelect(folder.id)}
            className="hover:underline"
          >
            {folder.name}
          </button>
        </span>
      ))}
    </nav>
  );
}

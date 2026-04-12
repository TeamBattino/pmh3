"use client";

import {
  Download,
  ExternalLink,
  FolderInput,
  MoreVertical,
  PencilLine,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { cn } from "@/lib/cn";
import type { Entry } from "./EntryList";

/**
 * Per-row three-dot menu. Always visible on mobile (no hover surface),
 * fades in on desktop row hover. Protected entries (system folders) have
 * destructive actions disabled.
 */
export function EntryRowMenu({
  entry,
  onOpen,
  onRename,
  onRequestDelete,
  onRequestMove,
  onDownload,
  isProtected,
}: {
  entry: Entry;
  onOpen: () => void;
  onRename: () => void;
  onRequestDelete: () => void;
  onRequestMove: () => void;
  onDownload?: () => void;
  isProtected: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Row actions"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none",
          "md:opacity-0 md:group-hover:opacity-100 md:data-[state=open]:opacity-100"
        )}
      >
        <MoreVertical className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem onSelect={onOpen}>
          <ExternalLink aria-hidden />
          {entry.type === "folder" ? "Open folder" : "Open details"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onRename} disabled={isProtected}>
          <PencilLine aria-hidden />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onRequestMove} disabled={isProtected}>
          <FolderInput aria-hidden />
          Move to…
        </DropdownMenuItem>
        {entry.type === "file" && onDownload && (
          <DropdownMenuItem onSelect={onDownload}>
            <Download aria-hidden />
            Download
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={isProtected}
          onSelect={onRequestDelete}
        >
          <Trash2 aria-hidden />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import { FileIcon, FileText, FileVideo, ImageIcon } from "lucide-react";
import type { FileRecord } from "@/lib/db/file-system-types";
import { cn } from "@/lib/cn";
import { formatBytes } from "./format";

/**
 * Virtualization isn't strictly required here — for v1 the list view renders
 * flat. We can swap in `useVirtualizer` later if lists in the thousands show
 * up in practice.
 */
export type FileListProps = {
  files: FileRecord[];
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onOpen?: (file: FileRecord) => void;
};

export function FileList({
  files,
  selectedIds,
  onToggleSelect,
  onOpen,
}: FileListProps) {
  const anySelected = !!selectedIds && selectedIds.size > 0;
  return (
    <div className="w-full">
      <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
        <span className="w-6" aria-hidden />
        <span>Name</span>
        <span>Size</span>
        <span>Date</span>
      </div>
      <ul>
        {files.map((file) => {
          const selected = selectedIds?.has(file.id) ?? false;
          return (
            <li
              key={file.id}
              role="button"
              tabIndex={0}
              aria-label={file.originalFilename}
              onClick={() => onOpen?.(file)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpen?.(file);
                }
              }}
              className={cn(
                "grid cursor-pointer grid-cols-[auto_1fr_auto_auto] items-center gap-3 border-b border-border px-3 py-2 text-sm hover:bg-accent/40",
                selected && "bg-accent/60"
              )}
            >
              <div
                className="flex w-6 items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                {onToggleSelect && (anySelected || selected) ? (
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleSelect(file.id)}
                    className="accent-primary"
                    aria-label={`Select ${file.originalFilename}`}
                  />
                ) : (
                  <KindIcon file={file} />
                )}
              </div>
              <span className="truncate">{file.originalFilename}</span>
              <span className="text-xs text-muted-foreground">
                {formatBytes(file.sizeBytes)}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(file.uploadedAt).toLocaleDateString()}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function KindIcon({ file }: { file: FileRecord }) {
  if (file.kind === "video")
    return <FileVideo className="size-4 text-muted-foreground" aria-hidden />;
  if (file.kind === "image")
    return <ImageIcon className="size-4 text-muted-foreground" aria-hidden />;
  if (file.mimeType === "application/pdf")
    return <FileText className="size-4 text-muted-foreground" aria-hidden />;
  return <FileIcon className="size-4 text-muted-foreground" aria-hidden />;
}

"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import type { FileRecord } from "@/lib/db/file-system-types";
import { FileCard } from "./FileCard";

/**
 * Virtualized grid of `FileCard` tiles. Column count is fixed per breakpoint
 * via a container-query-friendly CSS grid; the virtualizer only handles row
 * virtualization, which keeps the math simple while still covering the
 * "thousands of files" case.
 */
export type FileGridProps = {
  files: FileRecord[];
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onOpen?: (file: FileRecord) => void;
  /**
   * When true, clicking the tile body toggles selection instead of opening
   * the detail sheet. Parents usually pass `selection.size > 0` here.
   */
  selectionMode?: boolean;
  /** Approximate tile size in px for height calculations. */
  tileSize?: number;
};

const ROW_GAP = 16;
const CONTAINER_PADDING = 16;

export function FileGrid({
  files,
  selectedIds,
  onToggleSelect,
  onOpen,
  selectionMode,
  tileSize = 180,
}: FileGridProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const anySelected = !!selectedIds && selectedIds.size > 0;

  // Compute columns from parent width at render time — cheap and handles
  // resize without a ResizeObserver dance. Falls back to 4 on SSR.
  const cols =
    typeof window === "undefined" || !parentRef.current
      ? 4
      : Math.max(
          1,
          Math.floor(parentRef.current.clientWidth / tileSize)
        );
  const rows = Math.ceil(files.length / cols);

  const rowVirtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => tileSize + ROW_GAP,
    overscan: 3,
  });

  return (
    <div ref={parentRef} className="h-full w-full overflow-auto">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize() + CONTAINER_PADDING * 2}px`,
        }}
        className="relative w-full"
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowStart = virtualRow.index * cols;
          const rowEnd = Math.min(rowStart + cols, files.length);
          const rowFiles = files.slice(rowStart, rowEnd);
          return (
            <div
              key={virtualRow.key}
              className="absolute left-0 top-0 grid w-full gap-4 px-4"
              style={{
                transform: `translateY(${
                  virtualRow.start + CONTAINER_PADDING
                }px)`,
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                height: `${tileSize}px`,
              }}
            >
              {rowFiles.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  selected={selectedIds?.has(file.id)}
                  anySelected={anySelected}
                  selectionMode={selectionMode}
                  onSelectChange={
                    onToggleSelect
                      ? () => onToggleSelect(file.id)
                      : undefined
                  }
                  onOpen={onOpen}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

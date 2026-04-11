"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, useState } from "react";
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
  const [containerWidth, setContainerWidth] = useState(1024);
  const anySelected = !!selectedIds && selectedIds.size > 0;

  useEffect(() => {
    if (!parentRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(parentRef.current);
    setContainerWidth(parentRef.current.clientWidth);
    return () => observer.disconnect();
  }, []);

  const cols = Math.max(1, Math.floor(containerWidth / tileSize));
  const rows = Math.ceil(files.length / cols);

  const totalGap = (cols - 1) * ROW_GAP;
  const paddingX = CONTAINER_PADDING * 2;
  const availableWidth = Math.max(0, containerWidth - paddingX - totalGap);
  const actualTileSize = cols > 0 ? availableWidth / cols : tileSize;

  const rowVirtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => actualTileSize + ROW_GAP,
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
                height: `${actualTileSize}px`,
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

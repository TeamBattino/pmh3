"use client";

import { ChevronRight, Folder, FolderOpen, Inbox } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import type { FolderRecord } from "@/lib/db/file-system-types";

/**
 * Secondary sidebar tree for Documents. CMS Uploads pinned at the top with a
 * divider beneath it. Uses its own expanded state because Tailwind v4
 * doesn't do animated disclosures cheaply.
 *
 * `mode: "page"` navigates via URL (handled by the parent), `mode: "picker"`
 * updates the parent selection state.
 */

export type FolderTreeProps = {
  folders: FolderRecord[];
  selectedId: string | null;
  onSelect: (folderId: string) => void;
  className?: string;
  /**
   * Folder IDs that should render as disabled. Used by the move picker to
   * hide invalid destinations (source folders, their descendants, and any
   * target that would exceed the depth cap) without having to filter them
   * out of the tree, which would break parent/child rendering.
   */
  disabledIds?: Set<string>;
};

type TreeNode = FolderRecord & { children: TreeNode[] };

export function FolderTree({
  folders,
  selectedId,
  onSelect,
  className,
  disabledIds,
}: FolderTreeProps) {
  const { systemFolder, rootNodes } = useMemo(
    () => buildTree(folders),
    [folders]
  );
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(folders.map((f) => f.id))
  );

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className={cn("flex h-full flex-col gap-1 text-sm", className)}>
      {systemFolder && (
        <>
          <button
            type="button"
            onClick={() =>
              !disabledIds?.has(systemFolder.id) && onSelect(systemFolder.id)
            }
            disabled={disabledIds?.has(systemFolder.id) ?? false}
            className={cn(
              "flex items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-accent",
              selectedId === systemFolder.id && "bg-accent font-medium",
              disabledIds?.has(systemFolder.id) &&
                "cursor-not-allowed opacity-40 hover:bg-transparent"
            )}
          >
            <Inbox className="size-4" aria-hidden />
            <span className="truncate">CMS Uploads</span>
          </button>
          <div className="my-1 border-t border-border" aria-hidden />
        </>
      )}
      <ul>
        {rootNodes.map((node) => (
          <TreeItem
            key={node.id}
            node={node}
            depth={0}
            selectedId={selectedId}
            expanded={expanded}
            onToggle={toggle}
            onSelect={onSelect}
            disabledIds={disabledIds}
          />
        ))}
      </ul>
    </div>
  );
}

function TreeItem({
  node,
  depth,
  selectedId,
  expanded,
  onToggle,
  onSelect,
  disabledIds,
}: {
  node: TreeNode;
  depth: number;
  selectedId: string | null;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  disabledIds?: Set<string>;
}) {
  const isExpanded = expanded.has(node.id);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children.length > 0;
  const isDisabled = disabledIds?.has(node.id) ?? false;
  return (
    <li>
      <div
        className={cn(
          "flex items-center gap-1 rounded px-1 py-1.5",
          !isDisabled && "hover:bg-accent",
          isSelected && "bg-accent font-medium",
          isDisabled && "opacity-40"
        )}
        style={{ paddingLeft: `${depth * 0.75 + 0.25}rem` }}
      >
        <button
          type="button"
          onClick={() => hasChildren && onToggle(node.id)}
          className="rounded p-0.5"
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          <ChevronRight
            className={cn(
              "size-3 transition-transform",
              hasChildren ? "opacity-100" : "opacity-0",
              isExpanded && "rotate-90"
            )}
            aria-hidden
          />
        </button>
        <button
          type="button"
          onClick={() => !isDisabled && onSelect(node.id)}
          disabled={isDisabled}
          className={cn(
            "flex flex-1 items-center gap-2 text-left",
            isDisabled && "cursor-not-allowed"
          )}
        >
          {isExpanded ? (
            <FolderOpen className="size-4" aria-hidden />
          ) : (
            <Folder className="size-4" aria-hidden />
          )}
          <span className="truncate">{node.name}</span>
        </button>
      </div>
      {isExpanded && hasChildren && (
        <ul>
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              disabledIds={disabledIds}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function buildTree(folders: FolderRecord[]): {
  systemFolder: FolderRecord | null;
  rootNodes: TreeNode[];
} {
  const systemFolder = folders.find((f) => f.isSystemFolder) ?? null;
  const userFolders = folders.filter((f) => !f.isSystemFolder);

  const byId = new Map<string, TreeNode>();
  for (const folder of userFolders) {
    byId.set(folder.id, { ...folder, children: [] });
  }
  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return { systemFolder, rootNodes: roots };
}

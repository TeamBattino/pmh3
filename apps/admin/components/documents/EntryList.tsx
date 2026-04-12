"use client";

import {
  ChevronDown,
  ChevronUp,
  FileIcon,
  FileText,
  FileVideo,
  Folder as FolderIcon,
  Image as ImageIcon,
  Inbox,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { FileRecord, FolderRecord } from "@/lib/db/file-system-types";
import { formatBytes } from "@/components/file-system/format";
import { useLongPress } from "@/lib/hooks/use-long-press";
import { EntryRowMenu } from "./EntryRowMenu";

/**
 * Unified folders-then-files details view. Replaces `FileList` for the
 * documents section. Owns inline-rename state, selection interactions
 * (single-click / ctrl / shift / long-press / select-all), and the
 * three-dot row menu. Bulk-action and data handlers come from the parent.
 *
 * Interaction model:
 *   - Plain tap/click: open the entry (unless selection mode active, in
 *     which case it toggles).
 *   - Cmd / Ctrl + click: toggle selection, no open.
 *   - Shift + click: additive range select from the last anchor row.
 *   - Long-press (touch): enter selection mode, toggle that row.
 *   - Checkbox column: wrapped in a `<label>` with a much larger hit
 *     area than the native input alone.
 *   - Header checkbox: toggles select-all / deselect-all for the
 *     currently-visible entries. Renders as indeterminate when a
 *     partial selection exists.
 *   - Cmd / Ctrl + A on a focused row: select all.
 *   - F2 rename, Del delete, Arrow up/down focus, Enter/Space open.
 */
export type Entry =
  | { type: "folder"; folder: FolderRecord }
  | { type: "file"; file: FileRecord };

export type SortCol = "name" | "size" | "date";
export type SortDir = "asc" | "desc";
export type SortState = { col: SortCol; dir: SortDir };

export type Selection = {
  fileIds: Set<string>;
  folderIds: Set<string>;
};

export type EntryListProps = {
  entries: Entry[];
  sort: SortState;
  onSortChange: (next: SortState) => void;
  selection: Selection;
  /**
   * Functional setter — mirrors React's `useState` setter shape so the
   * parent can just pass its `setSelection` directly. Using an updater
   * lets EntryList compose deltas (range select, select-all) without
   * needing to read the current state first.
   */
  onSelectionChange: (updater: (prev: Selection) => Selection) => void;
  onOpenFolder: (folder: FolderRecord) => void;
  onOpenFile: (file: FileRecord) => void;
  onRename: (entry: Entry, nextName: string) => Promise<void>;
  onRequestDelete: (entry: Entry) => void;
  onRequestMove: (entry: Entry) => void;
  onDownload?: (file: FileRecord) => void;
  isProtected?: (entry: Entry) => boolean;
};

export function EntryList({
  entries,
  sort,
  onSortChange,
  selection,
  onSelectionChange,
  onOpenFolder,
  onOpenFile,
  onRename,
  onRequestDelete,
  onRequestMove,
  onDownload,
  isProtected,
}: EntryListProps) {
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [anchorKey, setAnchorKey] = useState<string | null>(null);

  const isSelected = (entry: Entry): boolean =>
    entry.type === "folder"
      ? selection.folderIds.has(entry.folder.id)
      : selection.fileIds.has(entry.file.id);

  const totalSelected =
    selection.fileIds.size + selection.folderIds.size;
  const anySelected = totalSelected > 0;
  const allSelected =
    entries.length > 0 && entries.every((e) => isSelected(e));
  const someSelected = anySelected && !allSelected;

  // ── Selection primitives ────────────────────────────────────────────

  const toggleOne = (entry: Entry) => {
    onSelectionChange((prev) => {
      const fileIds = new Set(prev.fileIds);
      const folderIds = new Set(prev.folderIds);
      if (entry.type === "file") {
        if (fileIds.has(entry.file.id)) fileIds.delete(entry.file.id);
        else fileIds.add(entry.file.id);
      } else {
        if (folderIds.has(entry.folder.id))
          folderIds.delete(entry.folder.id);
        else folderIds.add(entry.folder.id);
      }
      return { fileIds, folderIds };
    });
    setAnchorKey(entryKey(entry));
  };

  const addRange = (target: Entry) => {
    const targetKey = entryKey(target);
    const anchorIdx = anchorKey
      ? entries.findIndex((e) => entryKey(e) === anchorKey)
      : -1;
    const targetIdx = entries.findIndex((e) => entryKey(e) === targetKey);
    if (anchorIdx === -1 || targetIdx === -1) {
      toggleOne(target);
      return;
    }
    const [from, to] =
      anchorIdx <= targetIdx
        ? [anchorIdx, targetIdx]
        : [targetIdx, anchorIdx];
    const slice = entries.slice(from, to + 1);
    onSelectionChange((prev) => {
      const fileIds = new Set(prev.fileIds);
      const folderIds = new Set(prev.folderIds);
      for (const e of slice) {
        if (e.type === "file") fileIds.add(e.file.id);
        else folderIds.add(e.folder.id);
      }
      return { fileIds, folderIds };
    });
    // Range-select does NOT move the anchor; keeps the expected
    // Windows/Drive behavior where successive shift-clicks all anchor
    // from the same starting row.
  };

  const selectAll = () => {
    onSelectionChange(() => ({
      fileIds: new Set(
        entries
          .filter((e): e is Extract<Entry, { type: "file" }> => e.type === "file")
          .map((e) => e.file.id)
      ),
      folderIds: new Set(
        entries
          .filter(
            (e): e is Extract<Entry, { type: "folder" }> =>
              e.type === "folder"
          )
          .map((e) => e.folder.id)
      ),
    }));
  };

  const deselectAll = () => {
    onSelectionChange(() => ({ fileIds: new Set(), folderIds: new Set() }));
    setAnchorKey(null);
  };

  // ── Click dispatcher ────────────────────────────────────────────────

  const onActivate = (
    entry: Entry,
    mods: { ctrlOrMeta: boolean; shift: boolean }
  ) => {
    if (mods.shift) {
      addRange(entry);
      return;
    }
    if (mods.ctrlOrMeta) {
      toggleOne(entry);
      return;
    }
    if (anySelected) {
      toggleOne(entry);
      return;
    }
    if (entry.type === "folder") onOpenFolder(entry.folder);
    else onOpenFile(entry.file);
  };

  // ── Sort toggle ────────────────────────────────────────────────────

  const toggleSort = (col: SortCol) => {
    if (sort.col === col) {
      onSortChange({ col, dir: sort.dir === "asc" ? "desc" : "asc" });
    } else {
      onSortChange({ col, dir: "asc" });
    }
  };

  // ── Header checkbox indeterminate state ────────────────────────────

  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const onHeaderCheckbox = () => {
    if (allSelected) deselectAll();
    else selectAll();
  };

  // ── Empty state ────────────────────────────────────────────────────

  if (entries.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        This folder is empty.
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────

  const gridCols =
    "grid-cols-[2.5rem_1.25rem_1fr_5rem_6rem_2rem]";

  return (
    <div className="w-full">
      <div
        className={cn(
          "sticky top-0 z-10 grid items-center gap-3 border-b border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground",
          gridCols
        )}
      >
        <label
          className="flex h-8 w-full cursor-pointer items-center justify-center"
          aria-label={allSelected ? "Deselect all" : "Select all"}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            ref={headerCheckboxRef}
            type="checkbox"
            checked={allSelected}
            onChange={onHeaderCheckbox}
            className="accent-admin-primary"
          />
        </label>
        <span aria-hidden />
        <SortHeader label="Name" col="name" sort={sort} onClick={toggleSort} />
        <SortHeader
          label="Size"
          col="size"
          sort={sort}
          onClick={toggleSort}
          align="end"
        />
        <SortHeader
          label="Date"
          col="date"
          sort={sort}
          onClick={toggleSort}
          align="end"
        />
        <span aria-hidden />
      </div>
      <ul>
        {entries.map((entry) => {
          const key = entryKey(entry);
          return (
            <EntryRow
              key={key}
              entry={entry}
              gridCols={gridCols}
              selected={isSelected(entry)}
              anySelected={anySelected}
              renaming={renamingKey === key}
              onStartRename={() => setRenamingKey(key)}
              onCancelRename={() => setRenamingKey(null)}
              onCommitRename={async (nextName) => {
                try {
                  await onRename(entry, nextName);
                } finally {
                  setRenamingKey(null);
                }
              }}
              onToggleCheckbox={() => toggleOne(entry)}
              onActivate={(mods) => onActivate(entry, mods)}
              onRequestDelete={() => onRequestDelete(entry)}
              onRequestMove={() => onRequestMove(entry)}
              onOpen={() => {
                if (entry.type === "folder") onOpenFolder(entry.folder);
                else onOpenFile(entry.file);
              }}
              onDownload={
                entry.type === "file" && onDownload
                  ? () => onDownload(entry.file)
                  : undefined
              }
              onSelectAll={selectAll}
              isProtected={isProtected?.(entry) ?? false}
            />
          );
        })}
      </ul>
    </div>
  );
}

export function entryKey(entry: Entry): string {
  return entry.type === "folder"
    ? `folder:${entry.folder.id}`
    : `file:${entry.file.id}`;
}

function SortHeader({
  label,
  col,
  sort,
  onClick,
  align = "start",
}: {
  label: string;
  col: SortCol;
  sort: SortState;
  onClick: (col: SortCol) => void;
  align?: "start" | "end";
}) {
  const active = sort.col === col;
  return (
    <button
      type="button"
      onClick={() => onClick(col)}
      className={cn(
        "flex items-center gap-1 hover:text-foreground",
        align === "end" && "justify-end"
      )}
    >
      <span>{label}</span>
      {active &&
        (sort.dir === "asc" ? (
          <ChevronUp className="size-3" aria-hidden />
        ) : (
          <ChevronDown className="size-3" aria-hidden />
        ))}
    </button>
  );
}

function EntryRow({
  entry,
  gridCols,
  selected,
  anySelected,
  renaming,
  onStartRename,
  onCancelRename,
  onCommitRename,
  onToggleCheckbox,
  onActivate,
  onOpen,
  onRequestDelete,
  onRequestMove,
  onDownload,
  onSelectAll,
  isProtected,
}: {
  entry: Entry;
  gridCols: string;
  selected: boolean;
  anySelected: boolean;
  renaming: boolean;
  onStartRename: () => void;
  onCancelRename: () => void;
  onCommitRename: (next: string) => Promise<void>;
  onToggleCheckbox: () => void;
  onActivate: (mods: { ctrlOrMeta: boolean; shift: boolean }) => void;
  onOpen: () => void;
  onRequestDelete: () => void;
  onRequestMove: () => void;
  onDownload?: () => void;
  onSelectAll: () => void;
  isProtected: boolean;
}) {
  const { handlers: longPressHandlers, wasLongPress, resetLongPress } =
    useLongPress(onToggleCheckbox);

  const name =
    entry.type === "folder"
      ? entry.folder.name
      : entry.file.originalFilename;
  const date =
    entry.type === "folder"
      ? new Date(entry.folder.createdAt)
      : new Date(entry.file.uploadedAt);
  const sizeLabel =
    entry.type === "folder" ? "—" : formatBytes(entry.file.sizeBytes);

  return (
    <li
      className={cn(
        "group grid cursor-pointer items-center gap-3 border-b border-border px-3 py-2 text-sm hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-admin-primary/60",
        gridCols,
        selected && "bg-accent/60"
      )}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-row-stop]")) return;
        if (renaming) return;
        if (wasLongPress()) {
          resetLongPress();
          return;
        }
        onActivate({
          ctrlOrMeta: e.ctrlKey || e.metaKey,
          shift: e.shiftKey,
        });
      }}
      {...longPressHandlers}
      onKeyDown={(e) => {
        if (renaming) return;
        // Cmd/Ctrl + A: select all (intercept before the default
        // browser text-select behavior hits).
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
          e.preventDefault();
          onSelectAll();
          return;
        }
        // Let other modifier combos (reload, devtools, etc.) pass through.
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate({ ctrlOrMeta: false, shift: false });
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          const next = e.currentTarget
            .nextElementSibling as HTMLElement | null;
          next?.focus();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          const prev = e.currentTarget
            .previousElementSibling as HTMLElement | null;
          prev?.focus();
        } else if (e.key === "F2") {
          if (isProtected) return;
          e.preventDefault();
          onStartRename();
        } else if (e.key === "Delete") {
          if (isProtected) return;
          e.preventDefault();
          onRequestDelete();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={name}
      aria-pressed={selected}
    >
      <label
        data-row-stop=""
        className={cn(
          "flex h-8 w-full cursor-pointer items-center justify-center rounded transition-opacity hover:bg-accent/60",
          !anySelected && !selected && "opacity-0 md:group-hover:opacity-100"
        )}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Select ${name}`}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleCheckbox}
          className="accent-admin-primary"
        />
      </label>
      <KindIcon entry={entry} />
      <div className="min-w-0">
        {renaming ? (
          <InlineRename
            initial={name}
            onCommit={onCommitRename}
            onCancel={onCancelRename}
          />
        ) : (
          <span className="block truncate">{name}</span>
        )}
      </div>
      <span className="truncate text-right text-xs text-muted-foreground">
        {sizeLabel}
      </span>
      <span className="truncate text-right text-xs text-muted-foreground">
        {date.toLocaleDateString()}
      </span>
      <div
        data-row-stop=""
        className="flex items-center justify-end"
        onClick={(e) => e.stopPropagation()}
      >
        <EntryRowMenu
          entry={entry}
          onOpen={onOpen}
          onRename={onStartRename}
          onRequestDelete={onRequestDelete}
          onRequestMove={onRequestMove}
          onDownload={onDownload}
          isProtected={isProtected}
        />
      </div>
    </li>
  );
}

function KindIcon({ entry }: { entry: Entry }) {
  if (entry.type === "folder") {
    if (entry.folder.isSystemFolder) {
      return <Inbox className="size-4 text-muted-foreground" aria-hidden />;
    }
    return <FolderIcon className="size-4 text-muted-foreground" aria-hidden />;
  }
  const file = entry.file;
  if (file.kind === "video")
    return <FileVideo className="size-4 text-muted-foreground" aria-hidden />;
  if (file.kind === "image")
    return <ImageIcon className="size-4 text-muted-foreground" aria-hidden />;
  if (file.mimeType === "application/pdf")
    return <FileText className="size-4 text-muted-foreground" aria-hidden />;
  return <FileIcon className="size-4 text-muted-foreground" aria-hidden />;
}

function InlineRename({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (next: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [pending, setPending] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const dot = initial.lastIndexOf(".");
    if (dot > 0) el.setSelectionRange(0, dot);
    else el.select();
  }, [initial]);

  const commit = async () => {
    if (pending) return;
    const next = value.trim();
    if (!next || next === initial) {
      onCancel();
      return;
    }
    setPending(true);
    try {
      await onCommit(next);
    } catch {
      setPending(false);
    }
  };

  return (
    <input
      ref={ref}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      onClick={(e) => e.stopPropagation()}
      disabled={pending}
      className="h-7 w-full rounded border border-admin-primary bg-background px-1.5 py-1 text-sm outline-none ring-1 ring-admin-primary/40"
    />
  );
}

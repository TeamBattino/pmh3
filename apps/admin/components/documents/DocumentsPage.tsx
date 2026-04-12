"use client";

import { Home, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { FileUploadZone } from "@/components/file-system/FileUploadZone";
import { FileDetailSheet } from "@/components/file-system/FileDetailSheet";
import { DeleteBlockedDialog } from "@/components/file-system/DeleteBlockedDialog";
import {
  useBulkDeleteFiles,
  useCascadeDeleteFolder,
  useDeleteFile,
  useFolderFiles,
  useFolderTree,
  useUpdateFile,
  useUpdateFolder,
} from "@/lib/files/file-system-hooks";
import { publicUrlFor } from "@/components/file-system/thumb-url";
import { hrefForFolder } from "@/lib/files/folder-path";
import type {
  FileRecord,
  FolderRecord,
  Reference,
} from "@/lib/db/file-system-types";
import { FolderTree } from "./FolderTree";
import { DocumentsBreadcrumb } from "./DocumentsBreadcrumb";
import { NewFolderButton } from "./NewFolderButton";
import {
  MoveToFolderDialog,
  type MoveEntryRef,
} from "./MoveToFolderDialog";
import { CascadeDeleteDialog } from "./CascadeDeleteDialog";
import {
  EntryList,
  type Entry,
  type SortCol,
  type SortDir,
  type SortState,
} from "./EntryList";

/**
 * Client shell for `/documents`. `folderId` is driven by the URL
 * (`[[...path]]`), so back/forward/refresh all restore the right view.
 * `folderId === null` is the virtual Home: shows top-level folders only,
 * and has no file list because documents require a folderId.
 *
 * On mobile the sidebar is hidden; breadcrumb + row-clicks handle all
 * navigation. Desktop keeps the folder tree as a quick-jump aid.
 */
export type DocumentsPageProps = {
  folderId: string | null;
  initialFolders: FolderRecord[];
};

export function DocumentsPage({
  folderId,
  initialFolders,
}: DocumentsPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: folders = initialFolders } = useFolderTree({
    initialData: initialFolders,
  });

  const current = useMemo(
    () => (folderId ? folders.find((f) => f.id === folderId) ?? null : null),
    [folders, folderId]
  );

  const { data: files = [], isLoading: loadingFiles } = useFolderFiles(folderId);

  // At Home, entries are level-0 folders. Inside a folder, entries are
  // that folder's direct subfolders + its files.
  const childFolders = useMemo(
    () =>
      folderId
        ? folders.filter((f) => f.parentId === folderId)
        : folders.filter((f) => f.parentId === null),
    [folders, folderId]
  );

  // ── Sort (URL state) ───────────────────────────────────────────────
  // Memoised so downstream `useMemo`s that depend on `sort` don't
  // reinvalidate on every render.
  const sort: SortState = useMemo(
    () => ({
      col: (searchParams.get("sort") as SortCol | null) ?? "name",
      dir: (searchParams.get("dir") as SortDir | null) ?? "asc",
    }),
    [searchParams]
  );
  const setSort = (next: SortState) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.col === "name" && next.dir === "asc") {
      params.delete("sort");
      params.delete("dir");
    } else {
      params.set("sort", next.col);
      params.set("dir", next.dir);
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  };

  // ── Entries (sorted, folders first) ────────────────────────────────
  const entries: Entry[] = useMemo(() => {
    const folderEntries: Entry[] = childFolders.map((folder) => ({
      type: "folder",
      folder,
    }));
    const fileEntries: Entry[] = files.map((file) => ({
      type: "file",
      file,
    }));

    const nameOf = (e: Entry) =>
      e.type === "folder" ? e.folder.name : e.file.originalFilename;
    const sizeOf = (e: Entry) =>
      e.type === "folder" ? -1 : e.file.sizeBytes;
    const dateOf = (e: Entry) =>
      e.type === "folder"
        ? new Date(e.folder.createdAt).getTime()
        : new Date(e.file.uploadedAt).getTime();

    const cmp = (a: Entry, b: Entry) => {
      let delta = 0;
      switch (sort.col) {
        case "name":
          delta = nameOf(a).localeCompare(nameOf(b));
          break;
        case "size":
          delta = sizeOf(a) - sizeOf(b);
          break;
        case "date":
          delta = dateOf(a) - dateOf(b);
          break;
      }
      return sort.dir === "desc" ? -delta : delta;
    };

    folderEntries.sort(cmp);
    fileEntries.sort(cmp);
    return [...folderEntries, ...fileEntries];
  }, [childFolders, files, sort]);

  // ── Selection (mixed files + folders) ──────────────────────────────
  const [selection, setSelection] = useState<{
    fileIds: Set<string>;
    folderIds: Set<string>;
  }>({ fileIds: new Set(), folderIds: new Set() });

  const totalSelected = selection.fileIds.size + selection.folderIds.size;
  const clearSelection = () =>
    setSelection({ fileIds: new Set(), folderIds: new Set() });
  // Functional updater handed to EntryList so it can compose deltas
  // (range select, select-all) without needing to re-read state.
  const onSelectionChange = (
    updater: (prev: {
      fileIds: Set<string>;
      folderIds: Set<string>;
    }) => { fileIds: Set<string>; folderIds: Set<string> }
  ) => setSelection(updater);

  // Esc clears the current selection when any modal isn't already eating
  // the key. Cheap quality-of-life for keyboard users — this is outside
  // the row-level handler because focus may not be on a row when the
  // user reaches for Esc after interacting with the bulk bar.
  useEffect(() => {
    if (totalSelected === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (e.defaultPrevented) return;
      // If focus is in an input (e.g. inline rename), let it handle Esc.
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      clearSelection();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [totalSelected]);

  // ── Detail sheet ───────────────────────────────────────────────────
  const [detailId, setDetailId] = useState<string | null>(null);

  // ── Navigation ─────────────────────────────────────────────────────
  const navigateTo = (id: string | null) => {
    clearSelection();
    router.push(hrefForFolder(id, folders));
  };

  // ── Mutations ──────────────────────────────────────────────────────
  const updateFile = useUpdateFile();
  const updateFolder = useUpdateFolder();
  const deleteFile = useDeleteFile();
  const cascadeDelete = useCascadeDeleteFolder();
  const bulkDelete = useBulkDeleteFiles();

  // ── Dialog state ───────────────────────────────────────────────────
  const [blockers, setBlockers] = useState<
    Array<{ label: string; references: Reference[] }>
  >([]);
  const [cascadeTarget, setCascadeTarget] = useState<FolderRecord | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveEntries, setMoveEntries] = useState<MoveEntryRef[]>([]);

  const openMoveDialog = (entries: MoveEntryRef[]) => {
    if (entries.length === 0) return;
    setMoveEntries(entries);
    setMoveDialogOpen(true);
  };

  // ── Row handlers ───────────────────────────────────────────────────
  const onRename = async (entry: Entry, nextName: string) => {
    try {
      if (entry.type === "file") {
        await updateFile.mutateAsync({
          fileId: entry.file.id,
          patch: { originalFilename: nextName },
        });
        toast.success("File renamed");
      } else {
        await updateFolder.mutateAsync({
          folderId: entry.folder.id,
          patch: { name: nextName },
        });
        toast.success("Folder renamed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rename failed");
      throw err;
    }
  };

  const onRequestDelete = async (entry: Entry) => {
    if (entry.type === "file") {
      try {
        const result = await deleteFile.mutateAsync({ fileId: entry.file.id });
        if (result.status === "blocked") {
          setBlockers([
            {
              label: entry.file.originalFilename,
              references: result.references,
            },
          ]);
        } else {
          toast.success("File deleted");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed");
      }
      return;
    }
    // Folder → open the cascade confirmation dialog, which previews the
    // subtree and shows any blocking references before committing.
    setCascadeTarget(entry.folder);
  };

  const onRequestMove = (entry: Entry) => {
    const ref: MoveEntryRef =
      entry.type === "file"
        ? { type: "file", id: entry.file.id }
        : { type: "folder", id: entry.folder.id };
    openMoveDialog([ref]);
  };

  const onDownload = (file: FileRecord) => {
    const a = document.createElement("a");
    a.href = publicUrlFor(file.s3Key);
    a.download = file.originalFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const isProtected = (entry: Entry) =>
    entry.type === "folder" && entry.folder.isSystemFolder;

  // ── Bulk actions ───────────────────────────────────────────────────
  const onBulkMove = () => {
    const refs: MoveEntryRef[] = [
      ...Array.from(selection.fileIds).map(
        (id) => ({ type: "file", id }) as const
      ),
      ...Array.from(selection.folderIds).map(
        (id) => ({ type: "folder", id }) as const
      ),
    ];
    openMoveDialog(refs);
  };

  /**
   * Bulk delete with mixed selection. We run file delete and folder
   * cascades in parallel, then merge any blockers (referenced files /
   * blocked cascades) into a single `DeleteBlockedDialog`. Each operation
   * is independently atomic, so a partial success leaves the deleted
   * items gone and the blocked ones untouched — not perfect but matches
   * how file-only bulk delete already behaves today.
   */
  const onBulkDelete = async () => {
    const fileIds = Array.from(selection.fileIds);
    const folderIds = Array.from(selection.folderIds);
    if (fileIds.length === 0 && folderIds.length === 0) return;

    const allBlockers: Array<{ label: string; references: Reference[] }> = [];
    let deletedFiles = 0;
    let deletedFolders = 0;

    try {
      if (fileIds.length > 0) {
        const result = await bulkDelete.mutateAsync({ fileIds });
        deletedFiles += result.deleted.length;
        for (const b of result.blocked) {
          const file = files.find((f) => f.id === b.fileId);
          allBlockers.push({
            label: file?.originalFilename ?? b.fileId,
            references: b.references,
          });
        }
      }
      for (const id of folderIds) {
        const folder = folders.find((f) => f.id === id);
        const result = await cascadeDelete.mutateAsync({ folderId: id });
        if (result.blocked.length > 0) {
          for (const b of result.blocked) {
            allBlockers.push({
              label: `${folder?.name ?? id} › ${b.filename}`,
              references: b.references,
            });
          }
        } else {
          deletedFolders += 1;
          deletedFiles += result.deletedFileIds.length;
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      return;
    }

    if (allBlockers.length > 0) {
      setBlockers(allBlockers);
    } else if (deletedFiles > 0 || deletedFolders > 0) {
      const parts: string[] = [];
      if (deletedFiles > 0)
        parts.push(`${deletedFiles} file${deletedFiles === 1 ? "" : "s"}`);
      if (deletedFolders > 0)
        parts.push(
          `${deletedFolders} folder${deletedFolders === 1 ? "" : "s"}`
        );
      toast.success(`Deleted ${parts.join(" and ")}`);
    }
    clearSelection();
  };

  return (
    <div className="flex h-[calc(100svh-theme(spacing.14)-theme(spacing.12))] min-h-0 flex-col gap-4">
      <h1 className="text-2xl font-semibold">Documents</h1>
      <div className="flex flex-1 gap-4 overflow-hidden">
        <aside className="hidden w-64 shrink-0 flex-col gap-2 rounded-md border border-border bg-card p-2 md:flex">
          <button
            type="button"
            onClick={() => navigateTo(null)}
            className={cn(
              "flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent",
              folderId === null && "bg-accent font-medium"
            )}
          >
            <Home className="size-4" aria-hidden />
            <span className="truncate">Home</span>
          </button>
          <div className="my-1 border-t border-border" aria-hidden />
          <FolderTree
            folders={folders}
            selectedId={folderId}
            onSelect={(id) => navigateTo(id)}
            className="flex-1 overflow-y-auto"
          />
        </aside>

        <section className="flex flex-1 flex-col gap-3 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <DocumentsBreadcrumb folders={folders} currentId={folderId} />
            <div className="flex shrink-0 items-center gap-2">
              <NewFolderButton parentFolder={current} />
              {current && (
                <FileUploadZone
                  pool={{ kind: "documents", folderId: current.id }}
                  appearance="button"
                />
              )}
            </div>
          </div>

          {current && (
            <FileUploadZone
              pool={{ kind: "documents", folderId: current.id }}
            />
          )}

          <div className="flex-1 overflow-y-auto rounded-md border border-border bg-card">
            {current && loadingFiles ? (
              <div className="p-4">
                <Skeleton className="h-40 w-full" />
              </div>
            ) : (
              <EntryList
                entries={entries}
                sort={sort}
                onSortChange={setSort}
                selection={selection}
                onSelectionChange={onSelectionChange}
                onOpenFolder={(f) => navigateTo(f.id)}
                onOpenFile={(f) => setDetailId(f.id)}
                onRename={onRename}
                onRequestDelete={onRequestDelete}
                onRequestMove={onRequestMove}
                onDownload={onDownload}
                isProtected={isProtected}
              />
            )}
          </div>

          {totalSelected > 0 && (
            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background p-3 shadow">
              <span className="text-sm">
                {selection.fileIds.size} file
                {selection.fileIds.size === 1 ? "" : "s"}
                {selection.folderIds.size > 0 &&
                  `, ${selection.folderIds.size} folder${
                    selection.folderIds.size === 1 ? "" : "s"
                  }`}{" "}
                selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onBulkMove}>
                  Move to folder
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onBulkDelete}
                  disabled={bulkDelete.isPending || cascadeDelete.isPending}
                >
                  <Trash2 className="mr-1 size-4" aria-hidden />
                  Delete
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      <FileDetailSheet fileId={detailId} onClose={() => setDetailId(null)} />
      <MoveToFolderDialog
        open={moveDialogOpen}
        onClose={() => {
          setMoveDialogOpen(false);
          setMoveEntries([]);
          clearSelection();
        }}
        folders={folders}
        entries={moveEntries}
        currentFolderId={folderId}
      />
      <CascadeDeleteDialog
        key={cascadeTarget?.id ?? "none"}
        folder={cascadeTarget}
        onClose={() => setCascadeTarget(null)}
        onDeleted={() => {
          // If we just deleted the folder we're currently inside (possible
          // from e.g. a deep link into something about to be nuked), bounce
          // up to its parent.
          if (cascadeTarget && folderId === cascadeTarget.id) {
            const parentId = cascadeTarget.parentId;
            router.replace(hrefForFolder(parentId, folders));
          }
        }}
      />
      <DeleteBlockedDialog
        open={blockers.length > 0}
        onClose={() => setBlockers([])}
        blockers={blockers}
      />
    </div>
  );
}

"use client";

import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { FileUploadZone } from "@/components/file-system/FileUploadZone";
import { FileList } from "@/components/file-system/FileList";
import { FileDetailSheet } from "@/components/file-system/FileDetailSheet";
import { DeleteBlockedDialog } from "@/components/file-system/DeleteBlockedDialog";
import {
  useBulkDeleteFiles,
  useFolderFiles,
  useFolderTree,
} from "@/lib/files/file-system-hooks";
import { FolderTree } from "./FolderTree";
import { FolderBreadcrumb } from "./FolderBreadcrumb";
import { NewFolderButton } from "./NewFolderButton";
import { MoveToFolderDialog } from "./MoveToFolderDialog";
import type { Reference } from "@/lib/db/file-system-types";

/**
 * Top-level shell for `/documents`. Two-column layout: tree on the left, file
 * list on the right. Selection state + file-detail sheet are owned here so
 * switching folders resets both.
 */
export function DocumentsPage() {
  const { data: folders = [], isLoading: loadingTree } = useFolderTree();
  const systemFolder = folders.find((f) => f.isSystemFolder) ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Default to CMS Uploads once the tree loads.
  const effectiveId = selectedId ?? systemFolder?.id ?? null;

  const { data: files = [], isLoading: loadingFiles } = useFolderFiles(
    effectiveId
  );
  const current = useMemo(
    () => folders.find((f) => f.id === effectiveId) ?? null,
    [folders, effectiveId]
  );

  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const bulkDelete = useBulkDeleteFiles();
  const [blockers, setBlockers] = useState<
    Array<{ label: string; references: Reference[] }>
  >([]);

  const toggleSelect = (id: string) =>
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const clearSelection = () => setSelection(new Set());

  const onBulkDelete = async () => {
    const ids = Array.from(selection);
    if (ids.length === 0) return;
    const result = await bulkDelete.mutateAsync({ fileIds: ids });
    if (result.blocked.length > 0) {
      setBlockers(
        result.blocked.map((b) => {
          const file = files.find((f) => f.id === b.fileId);
          return {
            label: file?.originalFilename ?? b.fileId,
            references: b.references,
          };
        })
      );
    }
    clearSelection();
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
      <h1 className="text-2xl font-semibold">Documents</h1>
      <div className="flex flex-1 gap-4 overflow-hidden">
        <aside className="flex w-64 shrink-0 flex-col gap-2 rounded-md border border-border bg-card p-2">
          {loadingTree ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <FolderTree
              folders={folders}
              selectedId={effectiveId}
              onSelect={(id) => {
                setSelectedId(id);
                clearSelection();
              }}
              className="flex-1 overflow-y-auto"
            />
          )}
          <div className="mt-auto">
            <NewFolderButton parentFolder={current} />
          </div>
        </aside>

        <section className="flex flex-1 flex-col gap-3 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            {current ? (
              <FolderBreadcrumb
                folders={folders}
                currentId={current.id}
                onSelect={(id) => setSelectedId(id)}
              />
            ) : (
              <span className="text-sm text-muted-foreground">
                Select a folder
              </span>
            )}
            <FileUploadZone
              pool={{
                kind: "documents",
                folderId: effectiveId ?? "",
              }}
              appearance="button"
              disabled={!effectiveId}
            />
          </div>

          {current && (
            <FileUploadZone
              pool={{ kind: "documents", folderId: current.id }}
            />
          )}

          <div className="flex-1 overflow-y-auto rounded-md border border-border bg-card">
            {loadingFiles ? (
              <div className="p-4">
                <Skeleton className="h-40 w-full" />
              </div>
            ) : files.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {current
                  ? "No files in this folder yet."
                  : "Select a folder or upload to CMS Uploads."}
              </div>
            ) : (
              <FileList
                files={files}
                selectedIds={selection}
                onToggleSelect={toggleSelect}
                onOpen={(f) => setDetailId(f.id)}
              />
            )}
          </div>

          {selection.size > 0 && (
            <div className="sticky bottom-0 flex items-center justify-between gap-2 rounded-md border border-border bg-background p-3 shadow">
              <span className="text-sm">
                {selection.size} selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMoveDialogOpen(true)}
                >
                  Move to folder
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onBulkDelete}
                  disabled={bulkDelete.isPending}
                >
                  <Trash2 className="mr-1 size-4" aria-hidden />
                  Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      <FileDetailSheet
        fileId={detailId}
        onClose={() => setDetailId(null)}
      />
      <MoveToFolderDialog
        open={moveDialogOpen}
        onClose={() => setMoveDialogOpen(false)}
        folders={folders}
        fileIds={Array.from(selection)}
        currentFolderId={effectiveId}
      />
      <DeleteBlockedDialog
        open={blockers.length > 0}
        onClose={() => setBlockers([])}
        blockers={blockers}
      />
    </div>
  );
}

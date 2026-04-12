"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useCascadeDeleteFolder,
  usePreviewCascadeDeleteFolder,
} from "@/lib/files/file-system-hooks";
import type { FolderRecord, Reference } from "@/lib/db/file-system-types";

/**
 * Confirmation modal for deleting a folder with contents. Shows a
 * read-only preview of the subtree (file count, subfolder count) and
 * blocks the Confirm button if any files inside have puck-data
 * references — the blockers are rendered as an interactive list so the
 * user can navigate to the pages that are holding the files hostage.
 */
export function CascadeDeleteDialog({
  folder,
  onClose,
  onDeleted,
}: {
  folder: FolderRecord | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  // Caller passes a stable `key={folder?.id}` so this component remounts
  // per target. That keeps `running` per-folder without a reset effect.
  const open = !!folder;
  const preview = usePreviewCascadeDeleteFolder(folder?.id ?? null);
  const cascade = useCascadeDeleteFolder();
  const [running, setRunning] = useState(false);

  const blocked = preview.data?.blockedFiles ?? [];
  const canConfirm =
    !!preview.data &&
    blocked.length === 0 &&
    !preview.isLoading &&
    !running;

  const onConfirm = async () => {
    if (!folder || running) return;
    setRunning(true);
    try {
      const result = await cascade.mutateAsync({ folderId: folder.id });
      if (result.blocked.length > 0) {
        // Rare race: someone referenced a file between preview and commit.
        toast.error(
          `Cannot delete — ${result.blocked.length} file(s) are now referenced.`
        );
        setRunning(false);
        return;
      }
      toast.success(
        `Deleted “${folder.name}”${
          result.deletedFileIds.length > 0
            ? ` (${result.deletedFileIds.length} file${
                result.deletedFileIds.length === 1 ? "" : "s"
              })`
            : ""
        }`
      );
      onDeleted();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not delete folder"
      );
      setRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !running && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {blocked.length > 0
              ? "Cannot delete folder"
              : `Delete “${folder?.name ?? ""}”?`}
          </DialogTitle>
          <DialogDescription>
            {preview.isLoading
              ? "Checking folder contents…"
              : blocked.length > 0
                ? "Some files inside this folder are used on live pages."
                : describePreview(
                    preview.data?.fileCount ?? 0,
                    preview.data?.subfolderCount ?? 0
                  )}
          </DialogDescription>
        </DialogHeader>

        {preview.isLoading && (
          <div className="space-y-2 py-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {!preview.isLoading && blocked.length > 0 && (
          <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4" aria-hidden />
              <span className="font-medium">
                {blocked.length} blocking file
                {blocked.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Remove these files from the pages below first, then try again.
            </p>
            <ul className="space-y-2">
              {blocked.map((b) => (
                <BlockerEntry
                  key={b.fileId}
                  filename={b.filename}
                  references={b.references}
                />
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={running}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={!canConfirm}
          >
            {running ? "Deleting…" : "Delete everything"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function describePreview(fileCount: number, subfolderCount: number): string {
  if (fileCount === 0 && subfolderCount === 0) {
    return "This folder is empty.";
  }
  const parts: string[] = [];
  if (fileCount > 0)
    parts.push(`${fileCount} file${fileCount === 1 ? "" : "s"}`);
  if (subfolderCount > 0)
    parts.push(`${subfolderCount} subfolder${subfolderCount === 1 ? "" : "s"}`);
  return `This will permanently delete ${parts.join(
    " and "
  )}. This cannot be undone.`;
}

function BlockerEntry({
  filename,
  references,
}: {
  filename: string;
  references: Reference[];
}) {
  return (
    <li className="space-y-1 rounded border border-border bg-background p-2">
      <div className="truncate text-sm font-medium">{filename}</div>
      <ul className="space-y-1">
        {references.map((ref, i) => (
          <li
            key={`${ref.pageId}-${ref.componentId}-${ref.propPath}-${i}`}
            className="flex items-center justify-between gap-2 rounded bg-muted px-2 py-1 text-xs"
          >
            <span className="min-w-0 truncate">
              <strong>{ref.componentId}</strong>{" "}
              <span className="text-muted-foreground">on</span>{" "}
              <span className="font-mono">{ref.pageId}</span>
            </span>
            {ref.pageId.startsWith("/") && (
              <a
                href={`/web/editor${ref.pageId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-1 text-admin-primary hover:underline"
              >
                <ExternalLink className="size-3" aria-hidden />
                Editor
              </a>
            )}
          </li>
        ))}
      </ul>
    </li>
  );
}

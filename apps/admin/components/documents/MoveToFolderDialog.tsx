"use client";

import { Home } from "lucide-react";
import { useMemo, useState } from "react";
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
import { cn } from "@/lib/cn";
import { FolderTree } from "./FolderTree";
import type { FolderRecord } from "@/lib/db/file-system-types";
import {
  useMoveFilesToFolder,
  useUpdateFolder,
} from "@/lib/files/file-system-hooks";

/**
 * Destination picker for moving a mixed set of files and folders.
 *
 * Target semantics diverge by source type:
 *   - Files can go to any non-current user folder or to the CMS Uploads
 *     system folder, but NOT to Home (they need a non-null folderId).
 *   - Folders can go to any non-current user folder or to Home
 *     (parentId: null), but NOT into CMS Uploads (reserved as the
 *     automatic upload dump, not a container for organized folders).
 *
 * The valid target set for a mixed selection is the intersection.
 *
 * Invalid targets in the tree are rendered disabled rather than hidden,
 * so parent/child layout stays intact. Home gets its own button above
 * the tree since it doesn't live in the tree itself.
 */
const MAX_FOLDER_LEVEL = 2;

export type MoveEntryRef =
  | { type: "file"; id: string }
  | { type: "folder"; id: string };

type Target = { kind: "home" } | { kind: "folder"; id: string };

export function MoveToFolderDialog({
  open,
  onClose,
  folders,
  entries,
  currentFolderId,
}: {
  open: boolean;
  onClose: () => void;
  folders: FolderRecord[];
  entries: MoveEntryRef[];
  currentFolderId: string | null;
}) {
  const [target, setTarget] = useState<Target | null>(null);
  const moveFiles = useMoveFilesToFolder();
  const updateFolder = useUpdateFolder();

  const sourceFileIds = entries
    .filter((e) => e.type === "file")
    .map((e) => e.id);
  const sourceFolderIds = entries
    .filter((e) => e.type === "folder")
    .map((e) => e.id);

  const sourceFolders = useMemo(
    () =>
      sourceFolderIds
        .map((id) => folders.find((f) => f.id === id))
        .filter((f): f is FolderRecord => !!f),
    [folders, sourceFolderIds]
  );

  const disabledIds = useMemo(
    () => buildDisabledIds(folders, sourceFolders, currentFolderId),
    [folders, sourceFolders, currentFolderId]
  );

  // Home is only a legal destination when every source can live there —
  // i.e. the selection is folders-only. Files require a folderId and so
  // forbid moving the whole set to Home.
  const showHomeOption =
    sourceFileIds.length === 0 && sourceFolderIds.length > 0;

  const pending = moveFiles.isPending || updateFolder.isPending;
  const targetValid =
    target !== null &&
    (target.kind === "home"
      ? showHomeOption
      : !disabledIds.has(target.id));

  const submit = async () => {
    if (!targetValid || !target) return;
    try {
      const work: Promise<unknown>[] = [];
      if (sourceFileIds.length > 0 && target.kind === "folder") {
        work.push(
          moveFiles.mutateAsync({
            fileIds: sourceFileIds,
            targetFolderId: target.id,
          })
        );
      }
      for (const folderId of sourceFolderIds) {
        work.push(
          updateFolder.mutateAsync({
            folderId,
            patch: {
              parentId: target.kind === "home" ? null : target.id,
            },
          })
        );
      }
      await Promise.all(work);
      toast.success(
        `Moved ${entries.length} item${entries.length === 1 ? "" : "s"}`
      );
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Move failed");
    }
  };

  const label =
    entries.length === 0
      ? "Move"
      : `Move ${entries.length} item${entries.length === 1 ? "" : "s"}`;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !pending && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>Pick a destination folder.</DialogDescription>
        </DialogHeader>
        <div className="max-h-96 space-y-1 overflow-y-auto rounded-md border border-border p-2">
          {showHomeOption && (
            <>
              <button
                type="button"
                onClick={() => setTarget({ kind: "home" })}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent",
                  target?.kind === "home" && "bg-accent font-medium"
                )}
              >
                <Home className="size-4" aria-hidden />
                <span>Home</span>
              </button>
              <div className="my-1 border-t border-border" aria-hidden />
            </>
          )}
          <FolderTree
            folders={folders}
            selectedId={target?.kind === "folder" ? target.id : null}
            onSelect={(id) => setTarget({ kind: "folder", id })}
            disabledIds={disabledIds}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!targetValid || pending}>
            Move here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Compute the set of folder IDs that should be rendered as
 * non-selectable destinations.
 *
 *   1. The current folder (moving "here" is a no-op).
 *   2. Any source folder and its entire descendant subtree — you can't
 *      move a folder into itself or into one of its own children.
 *   3. The depth cap: after the move, no folder in the relocated subtree
 *      may end up at a level > MAX_FOLDER_LEVEL.
 *   4. The CMS Uploads system folder, when the selection contains any
 *      folder (it's the upload dump, not a user-folder container).
 */
function buildDisabledIds(
  folders: FolderRecord[],
  sourceFolders: FolderRecord[],
  currentFolderId: string | null
): Set<string> {
  const disabled = new Set<string>();

  if (currentFolderId) disabled.add(currentFolderId);

  if (sourceFolders.length > 0) {
    for (const f of folders) {
      if (f.isSystemFolder) disabled.add(f.id);
    }
  }

  for (const src of sourceFolders) {
    disabled.add(src.id);
    for (const f of folders) {
      if (f.ancestorIds.includes(src.id)) disabled.add(f.id);
    }
  }

  if (sourceFolders.length > 0) {
    const heights = sourceFolders.map((src) => {
      const maxLevel = folders.reduce((m, f) => {
        const inSubtree = f.id === src.id || f.ancestorIds.includes(src.id);
        return inSubtree ? Math.max(m, f.level) : m;
      }, src.level);
      return maxLevel - src.level;
    });
    const worstHeight = Math.max(...heights);
    for (const f of folders) {
      if (f.level + 1 + worstHeight > MAX_FOLDER_LEVEL) {
        disabled.add(f.id);
      }
    }
  }

  return disabled;
}

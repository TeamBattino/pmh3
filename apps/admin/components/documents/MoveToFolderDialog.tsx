"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { FolderTree } from "./FolderTree";
import type { FolderRecord } from "@/lib/db/file-system-types";
import { useMoveFilesToFolder } from "@/lib/files/file-system-hooks";

export function MoveToFolderDialog({
  open,
  onClose,
  folders,
  fileIds,
  currentFolderId,
}: {
  open: boolean;
  onClose: () => void;
  folders: FolderRecord[];
  fileIds: string[];
  currentFolderId: string | null;
}) {
  const [targetId, setTargetId] = useState<string | null>(null);
  const move = useMoveFilesToFolder();

  // Exclude the current folder from the list of valid destinations.
  const selectable = folders.filter((f) => f.id !== currentFolderId);

  const submit = async () => {
    if (!targetId) return;
    await move.mutateAsync({ fileIds, targetFolderId: targetId });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Move {fileIds.length} file(s)</DialogTitle>
          <DialogDescription>
            Pick a destination folder.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto rounded-md border border-border p-2">
          <FolderTree
            folders={selectable}
            selectedId={targetId}
            onSelect={setTargetId}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!targetId || move.isPending}
          >
            Move here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { FolderPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { useCreateFolder } from "@/lib/files/file-system-hooks";
import type { FolderRecord } from "@/lib/db/file-system-types";

/**
 * Folder-create trigger. Disabled when the currently selected folder is
 * already at the max depth (level 2).
 */
export function NewFolderButton({
  parentFolder,
}: {
  parentFolder: FolderRecord | null;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const createFolder = useCreateFolder();
  const disabled = parentFolder ? parentFolder.level >= 2 : false;

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await createFolder.mutateAsync({
      name: trimmed,
      parentId: parentFolder?.isSystemFolder ? null : parentFolder?.id ?? null,
    });
    setName("");
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={
          disabled ? "Cannot nest more than three levels deep" : "New folder"
        }
      >
        <FolderPlus className="mr-1 size-4" aria-hidden />
        New folder
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Folder name"
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={!name.trim() || createFolder.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

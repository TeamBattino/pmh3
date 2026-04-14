"use client";

import { Lock, LockOpen, MoreVertical, Pencil, Trash2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { Input } from "@/components/ui/Input";
import {
  useDeleteCollection,
  useUpdateCollection,
} from "@/lib/files/file-system-hooks";
import type { CollectionRecord } from "@/lib/db/file-system-types";

/**
 * Rename + delete controls for an album or album collection. Hidden for
 * system albums (CMS Uploads) since they are managed by the system.
 *
 * Delete confirmation surfaces the server's "not empty" error as a user-
 * friendly toast — by design you can't delete a non-empty album/collection
 * and must clear its contents first.
 */
export function CollectionManageMenu({
  collection,
  onDeleted,
}: {
  collection: CollectionRecord;
  /** Called after a successful delete. Typically navigates one level up. */
  onDeleted: () => void;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [title, setTitle] = useState(collection.title);
  const update = useUpdateCollection();
  const del = useDeleteCollection();

  if (collection.isSystemAlbum) return null;

  const label =
    collection.type === "album_collection" ? "album collection" : "album";

  const submitRename = async () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === collection.title) {
      setRenameOpen(false);
      return;
    }
    try {
      await update.mutateAsync({
        collectionId: collection.id,
        patch: { title: trimmed },
      });
      toast.success(`Renamed to "${trimmed}"`);
      setRenameOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rename failed");
    }
  };

  const submitDelete = async () => {
    try {
      await del.mutateAsync({ collectionId: collection.id });
      toast.success(`Deleted ${label}`);
      setDeleteOpen(false);
      onDeleted();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Could not delete ${label}`
      );
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Manage ${label}`}
          >
            <MoreVertical className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              setTitle(collection.title);
              setRenameOpen(true);
            }}
          >
            <Pencil className="mr-2 size-4" aria-hidden />
            Rename
          </DropdownMenuItem>
          {collection.type === "album" && (
            <DropdownMenuItem
              onSelect={async () => {
                try {
                  await update.mutateAsync({
                    collectionId: collection.id,
                    patch: { passwordProtected: !collection.passwordProtected },
                  });
                  toast.success(
                    collection.passwordProtected
                      ? "Album unlocked"
                      : "Album protected"
                  );
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Could not update"
                  );
                }
              }}
            >
              {collection.passwordProtected ? (
                <>
                  <LockOpen className="mr-2 size-4" aria-hidden />
                  Remove password protection
                </>
              ) : (
                <>
                  <Lock className="mr-2 size-4" aria-hidden />
                  Password protect album
                </>
              )}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 size-4" aria-hidden />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {label}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename();
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitRename}
              disabled={!title.trim() || update.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {label}?</DialogTitle>
            <DialogDescription>
              {collection.type === "album_collection"
                ? "The album collection must be empty — remove or move any albums inside it first."
                : "The album must be empty — remove or delete any files inside it first."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submitDelete}
              disabled={del.isPending}
            >
              <Trash2 className="mr-1 size-4" aria-hidden />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

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
import { useAddFilesToAlbum } from "@/lib/files/file-system-hooks";
import type { CollectionRecord } from "@/lib/db/file-system-types";

/**
 * Flat picker for "which album should I add these files to?". Excludes the
 * CMS Uploads system album (landing-only) and the current album.
 */
export function AddToAlbumDialog({
  open,
  onClose,
  collections,
  fileIds,
  currentAlbumId,
}: {
  open: boolean;
  onClose: () => void;
  collections: CollectionRecord[];
  fileIds: string[];
  currentAlbumId: string | null;
}) {
  const [targetId, setTargetId] = useState<string | null>(null);
  const addToAlbum = useAddFilesToAlbum();

  const albumCollections = collections.filter(
    (c) => c.type === "album_collection"
  );
  const albums = collections.filter(
    (c) =>
      c.type === "album" &&
      !c.isSystemAlbum &&
      c.id !== currentAlbumId
  );
  const albumsByCollection = new Map<string, CollectionRecord[]>();
  for (const a of albums) {
    if (!a.parentId) continue;
    const bucket = albumsByCollection.get(a.parentId) ?? [];
    bucket.push(a);
    albumsByCollection.set(a.parentId, bucket);
  }

  const submit = async () => {
    if (!targetId) return;
    await addToAlbum.mutateAsync({ fileIds, targetAlbumId: targetId });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add {fileIds.length} file(s) to album</DialogTitle>
          <DialogDescription>
            Files keep any existing album memberships. Adding to an album they
            already belong to is a no-op.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-96 space-y-3 overflow-y-auto rounded-md border border-border p-2 text-sm">
          {albumCollections.length === 0 && (
            <div className="text-muted-foreground">
              No album collections yet. Create one first.
            </div>
          )}
          {albumCollections.map((ac) => {
            const children = albumsByCollection.get(ac.id) ?? [];
            if (children.length === 0) return null;
            return (
              <div key={ac.id}>
                <div className="text-xs font-semibold text-muted-foreground">
                  {ac.title}
                </div>
                <ul className="mt-1 space-y-0.5">
                  {children.map((album) => (
                    <li key={album.id}>
                      <button
                        type="button"
                        onClick={() => setTargetId(album.id)}
                        className={`w-full rounded px-2 py-1 text-left hover:bg-accent ${
                          targetId === album.id ? "bg-accent font-medium" : ""
                        }`}
                      >
                        {album.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!targetId || addToAlbum.isPending}
          >
            Add here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

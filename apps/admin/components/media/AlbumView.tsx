"use client";

import { ChevronRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";
import { DeleteBlockedDialog } from "@/components/file-system/DeleteBlockedDialog";
import { FileDetailSheet } from "@/components/file-system/FileDetailSheet";
import { FileGrid } from "@/components/file-system/FileGrid";
import { FileUploadZone } from "@/components/file-system/FileUploadZone";
import {
  useBulkDeleteFiles,
  useCollectionFiles,
  useCollectionTree,
  useRemoveFilesFromAlbum,
} from "@/lib/files/file-system-hooks";
import type { Reference } from "@/lib/db/file-system-types";
import { AddToAlbumDialog } from "./AddToAlbumDialog";

/**
 * The working file manager for Media: grid view, selection, upload zone,
 * and the add/remove/delete bulk actions.
 */
export function AlbumView({
  collectionId,
  albumId,
}: {
  collectionId: string | null;
  albumId: string;
}) {
  const { data: collections = [] } = useCollectionTree();
  const album = collections.find((c) => c.id === albumId);
  const parentCollection = collections.find(
    (c) => c.id === (collectionId ?? album?.parentId ?? "")
  );
  const { data: files = [], isLoading } = useCollectionFiles(albumId);

  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [blockers, setBlockers] = useState<
    Array<{ label: string; references: Reference[] }>
  >([]);

  const bulkDelete = useBulkDeleteFiles();
  const removeFromAlbum = useRemoveFilesFromAlbum();

  const toggle = (id: string) =>
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const clear = () => setSelection(new Set());

  const onDelete = async () => {
    const ids = Array.from(selection);
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
    clear();
  };

  const onRemoveFromAlbum = async () => {
    const ids = Array.from(selection);
    const result = await removeFromAlbum.mutateAsync({
      fileIds: ids,
      sourceAlbumId: albumId,
    });
    if (result.blocked.length > 0) {
      toast.error(
        `${result.blocked.length} file(s) would have no albums left. Use Delete instead.`
      );
    }
    clear();
  };

  if (!album) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-3">
      <nav className="flex items-center gap-1 text-sm">
        <Link
          href="/media"
          className="text-muted-foreground hover:text-foreground"
        >
          Media
        </Link>
        {parentCollection && !album.isSystemAlbum && (
          <>
            <ChevronRight className="size-3 text-muted-foreground" aria-hidden />
            <Link
              href={`/media/${parentCollection.id}`}
              className="text-muted-foreground hover:text-foreground"
            >
              {parentCollection.title}
            </Link>
          </>
        )}
        <ChevronRight className="size-3 text-muted-foreground" aria-hidden />
        <span className="font-medium">{album.title}</span>
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{album.title}</h1>
          <div className="text-xs text-muted-foreground">
            {files.length} file{files.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <FileUploadZone pool={{ kind: "media", albumId }} />

      <div className="flex-1 overflow-hidden rounded-md border border-border bg-card">
        {isLoading ? (
          <div className="p-4">
            <Skeleton className="h-48 w-full" />
          </div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No files in this album yet. Drop some above.
          </div>
        ) : (
          <FileGrid
            files={files}
            selectedIds={selection}
            onToggleSelect={toggle}
            onOpen={(f) => setDetailId(f.id)}
          />
        )}
      </div>

      {selection.size > 0 && (
        <div className="sticky bottom-0 flex items-center justify-between gap-2 rounded-md border border-border bg-background p-3 shadow">
          <span className="text-sm">{selection.size} selected</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddOpen(true)}
            >
              Add to album
            </Button>
            {!album.isSystemAlbum && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRemoveFromAlbum}
                disabled={removeFromAlbum.isPending}
              >
                Remove from this album
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={bulkDelete.isPending}
            >
              <Trash2 className="mr-1 size-4" aria-hidden />
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={clear}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <FileDetailSheet
        fileId={detailId}
        onClose={() => setDetailId(null)}
      />
      <AddToAlbumDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        collections={collections}
        fileIds={Array.from(selection)}
        currentAlbumId={albumId}
      />
      <DeleteBlockedDialog
        open={blockers.length > 0}
        onClose={() => setBlockers([])}
        blockers={blockers}
      />
    </div>
  );
}

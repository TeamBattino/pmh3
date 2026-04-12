"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import type { FileRecord, Reference } from "@/lib/db/file-system-types";
import {
  useCollectionTree,
  useDeleteFile,
  useFile,
  useFileAlbumCount,
  useFileReferences,
  useRemoveFilesFromAlbum,
  useUpdateCollection,
  useUpdateFile,
} from "@/lib/files/file-system-hooks";
import { useFileReplace } from "@/lib/files/useFileReplace";
import {
  Download,
  ExternalLink,
  FolderMinus,
  FolderPlus,
  Image as ImageIcon,
  Pencil,
  Replace,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AddToAlbumDialog } from "../media/AddToAlbumDialog";
import { DeleteBlockedDialog } from "./DeleteBlockedDialog";
import { formatBytes } from "./format";

/**
 * A target that can have its cover image set to the currently-displayed
 * file. Pre-computed by callers so the sheet doesn't need to reason about
 * tree shapes — each target is either an album or an album collection.
 */
export type CoverTarget = {
  collectionId: string;
  /** Short name for the button — "album" / "album collection". */
  label: string;
  /** Display name, used in toast confirmations. */
  name: string;
};

export type FileDetailSheetProps = {
  fileId: string | null;
  onClose: () => void;
  /** Optional contextual actions. Passed by callers like AlbumView. */
  coverTargets?: CoverTarget[];
  albumId?: string;
};

export function FileDetailSheet({
  fileId,
  onClose,
  coverTargets,
  albumId,
}: FileDetailSheetProps) {
  const open = !!fileId;
  const fileQuery = useFile(fileId);
  const file = fileQuery.data ?? null;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent side="right" className="flex w-full max-w-lg flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border">
          <SheetTitle>File details</SheetTitle>
          <SheetDescription>
            Metadata and actions for the selected file.
          </SheetDescription>
        </SheetHeader>

        {fileQuery.isLoading && (
          <div className="space-y-3 p-6">
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        )}

        {file && (
          <FileDetailBody
            key={file.id}
            file={file}
            onClose={onClose}
            coverTargets={coverTargets}
            albumId={albumId}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function FileDetailBody({
  file,
  onClose,
  coverTargets,
  albumId,
}: {
  file: FileRecord;
  onClose: () => void;
  coverTargets?: CoverTarget[];
  albumId?: string;
}) {
  const refsQuery = useFileReferences(file.id);
  const updateFile = useUpdateFile();
  const updateCollection = useUpdateCollection();
  const deleteFile = useDeleteFile();
  const { replaceFile: runReplace } = useFileReplace();

  const { data: collections = [] } = useCollectionTree();
  const { data: albumCount = 0, isLoading: isLoadingAlbumCount } = useFileAlbumCount(file.id);
  const currentAlbum = collections.find((c) => c.id === albumId);
  const removeFromAlbum = useRemoveFilesFromAlbum();
  const [addOpen, setAddOpen] = useState(false);

  const [blockers, setBlockers] = useState<Reference[] | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(file.originalFilename);
  const [altDraft, setAltDraft] = useState(file.altText ?? "");
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const commitName = async () => {
    const next = nameDraft.trim();
    if (!next || next === file.originalFilename) {
      setEditingName(false);
      return;
    }
    try {
      await updateFile.mutateAsync({
        fileId: file.id,
        patch: { originalFilename: next },
      });
      toast.success("Filename updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not rename file");
    }
    setEditingName(false);
  };

  const commitAlt = async () => {
    const next = altDraft.trim();
    if (next === (file.altText ?? "")) return;
    try {
      await updateFile.mutateAsync({
        fileId: file.id,
        patch: { altText: next || null },
      });
      toast.success("Alt text saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save alt text");
    }
  };

  const setAsCover = async (target: CoverTarget) => {
    try {
      await updateCollection.mutateAsync({
        collectionId: target.collectionId,
        patch: { coverFileId: file.id },
      });
      toast.success(`Set as cover for "${target.name}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not set cover");
    }
  };

  const onDelete = async () => {
    const result = await deleteFile.mutateAsync({ fileId: file.id });
    if (result.status === "blocked") {
      setBlockers(result.references);
      return;
    }
    onClose();
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6">
        <PreviewArea file={file} />

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {editingName ? (
              <Input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitName();
                  if (e.key === "Escape") {
                    setNameDraft(file.originalFilename);
                    setEditingName(false);
                  }
                }}
              />
            ) : (
              <div className="flex-1 truncate text-base font-medium">
                {file.originalFilename}
              </div>
            )}
            <button
              type="button"
              className="rounded p-1 text-muted-foreground hover:bg-accent"
              onClick={() => setEditingName((v) => !v)}
              aria-label="Rename file"
            >
              <Pencil className="size-4" aria-hidden />
            </button>
          </div>
          <div className="text-xs text-muted-foreground">
            {formatBytes(file.sizeBytes)}
            {file.width && file.height && (
              <>
                {" · "}
                {file.width}×{file.height}
              </>
            )}
            {" · "}
            {file.mimeType}
          </div>
          <div className="text-xs text-muted-foreground">
            Uploaded {new Date(file.uploadedAt).toLocaleString()}
          </div>
        </div>

        {file.kind === "image" && (
          <div className="space-y-1">
            <label htmlFor="file-alt-text" className="text-xs font-medium">
              Alt text
            </label>
            <textarea
              id="file-alt-text"
              className="min-h-16 w-full resize-y rounded-md border border-border bg-background p-2 text-sm"
              value={altDraft}
              onChange={(e) => setAltDraft(e.target.value)}
              onBlur={commitAlt}
            />
          </div>
        )}

        {file.kind === "image" && coverTargets && coverTargets.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Cover image</div>
            <div className="overflow-hidden rounded-md border border-border">
              {coverTargets.map((target, idx) => (
                <button
                  key={target.collectionId}
                  className={`flex w-full items-center justify-between bg-card px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50 ${
                    idx > 0 ? "border-t border-border" : ""
                  }`}
                  onClick={() => setAsCover(target)}
                  disabled={updateCollection.isPending}
                >
                  <div className="flex items-center gap-2">
                    <ImageIcon className="size-4 text-muted-foreground" aria-hidden />
                    <span className="text-left font-medium">Use for &quot;{target.name}&quot;</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{target.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}



        <UsedInSection
          isLoading={refsQuery.isLoading}
          references={refsQuery.data ?? []}
        />
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border px-6 py-4">
        <Button asChild variant="outline" className="flex-1 basis-[120px]">
          <a
            href={file.signedUrl ?? "#"}
            download={file.originalFilename}
          >
            <Download className="mr-2 size-4" aria-hidden />
            Download
          </a>
        </Button>
        <Button
          variant="outline"
          className="flex-1 basis-[120px]"
          onClick={() => replaceInputRef.current?.click()}
        >
          <Replace className="mr-2 size-4" aria-hidden />
          Replace
        </Button>
        <input
          ref={replaceInputRef}
          type="file"
          className="hidden"
          onChange={async (e) => {
            const next = e.target.files?.[0];
            e.target.value = "";
            if (!next || !file) return;
            try {
              await runReplace(file, next);
              toast.success("File replaced");
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : "Replace failed"
              );
            }
          }}
        />
        {/*
          Albums are a media-pool concept. Files in the documents pool
          (folderId !== null) can never belong to an album — the DB layer
          already hard-skips them in `addFilesToAlbum` — so offering the
          action in the UI just misleads the user. Gate on the pool, not
          on kind: a document that happens to be an image is still a
          document and still shouldn't be album-addable.
        */}
        {file.folderId === null && (
          <Button
            variant="outline"
            className="flex-1 basis-[140px]"
            onClick={() => setAddOpen(true)}
          >
            <FolderPlus className="mr-2 size-4" aria-hidden />
            Add to album...
          </Button>
        )}
        {file.folderId === null && currentAlbum && !currentAlbum.isSystemAlbum && (
          <Button
            variant="outline"
            className="flex-1 basis-[170px]"
            onClick={async () => {
              const result = await removeFromAlbum.mutateAsync({
                fileIds: [file.id],
                sourceAlbumId: currentAlbum.id,
              });
              if (result.blocked.length > 0) {
                toast.error(
                  "File would have no albums left. Use Delete instead."
                );
              } else {
                toast.success(`Removed from ${currentAlbum.title}`);
                onClose();
              }
            }}
            disabled={removeFromAlbum.isPending || isLoadingAlbumCount || albumCount <= 1}
          >
            <FolderMinus className="mr-2 size-4" aria-hidden />
            Remove from &quot;{currentAlbum.title}&quot;
          </Button>
        )}
        <Button
          variant="destructive"
          className="flex-1 basis-[100px]"
          onClick={onDelete}
          disabled={deleteFile.isPending}
        >
          <Trash2 className="mr-2 size-4" aria-hidden />
          Delete file
        </Button>
      </div>

      <DeleteBlockedDialog
        open={!!blockers}
        onClose={() => setBlockers(null)}
        blockers={
          blockers
            ? [{ label: file.originalFilename, references: blockers }]
            : []
        }
      />
      <AddToAlbumDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        collections={collections}
        fileIds={[file.id]}
        currentAlbumId={albumId ?? null}
      />
    </>
  );
}

function PreviewArea({ file }: { file: FileRecord }) {
  const [open, setOpen] = useState(false);

  if (file.kind === "image") {
    const thumbUrl = file.signedThumbMdUrl ?? file.signedUrl ?? "";
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-64 w-full shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted"
          aria-label="Open full-size preview"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbUrl}
            alt={file.altText ?? file.originalFilename}
            className="max-h-full max-w-full object-contain"
          />
        </button>

        <NativeLightbox
          open={open}
          onClose={() => setOpen(false)}
          src={thumbUrl}
          alt={file.altText ?? file.originalFilename}
        />
      </>
    );
  }
  if (file.kind === "video") {
    return (
      <video
        controls
        src={file.signedUrl ?? ""}
        className="w-full rounded-md border border-border"
      />
    );
  }
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-muted p-6">
      <div className="text-sm font-medium">{file.originalFilename}</div>
      <Button asChild variant="outline">
        <a
          href={file.signedUrl ?? "#"}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink className="mr-1 size-4" aria-hidden />
          Open in new tab
        </a>
      </Button>
    </div>
  );
}

function NativeLightbox({
  src,
  alt,
  open,
  onClose,
}: {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onClose();
        }
      }}
      className="m-auto max-h-full max-w-full overflow-hidden border-none bg-transparent p-0 backdrop:bg-black/90 focus:outline-none"
    >
      {open && (
        <div className="pointer-events-none relative flex h-[100dvh] w-[100dvw] items-center justify-center p-4 sm:p-8">
          <button
            type="button"
            onClick={onClose}
            className="pointer-events-auto absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Close preview"
          >
            <X className="size-6" aria-hidden />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="pointer-events-auto max-h-full max-w-full object-contain"
          />
        </div>
      )}
    </dialog>
  );
}

function UsedInSection({
  isLoading,
  references,
}: {
  isLoading: boolean;
  references: Reference[];
}) {
  if (isLoading) {
    return (
      <div className="space-y-1">
        <div className="text-xs font-medium">Used in</div>
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium">Used in</div>
      {references.length === 0 ? (
        <div className="text-xs text-muted-foreground">
          Not used in any page.
        </div>
      ) : (
        <ul className="space-y-1">
          {references.map((ref, i) => (
            <li
              key={`${ref.pageId}-${ref.componentId}-${ref.propPath}-${i}`}
              className="rounded border border-border bg-muted px-2 py-1 text-xs"
            >
              <strong>{ref.componentId}</strong> on{" "}
              <span className="font-mono">{ref.pageId}</span>
              {ref.pageId.startsWith("/") && (
                <div className="mt-1 flex gap-2">
                  <a
                    href={ref.pageId}
                    target="_blank"
                    rel="noreferrer"
                    className="text-admin-primary hover:underline"
                  >
                    Open page →
                  </a>
                  <a
                    href={`/web/editor${ref.pageId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-admin-primary hover:underline"
                  >
                    Open editor →
                  </a>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import {
  Download,
  ExternalLink,
  Image as ImageIcon,
  Pencil,
  Replace,
  Trash2,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/Sheet";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useDeleteFile,
  useFile,
  useFileReferences,
  useUpdateCollection,
  useUpdateFile,
} from "@/lib/files/file-system-hooks";
import { useFileReplace } from "@/lib/files/useFileReplace";
import type { FileRecord, Reference } from "@/lib/db/file-system-types";
import { DeleteBlockedDialog } from "./DeleteBlockedDialog";
import { formatBytes } from "./format";
import { publicUrlFor } from "./thumb-url";

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
};

export function FileDetailSheet({
  fileId,
  onClose,
  coverTargets,
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
}: {
  file: FileRecord;
  onClose: () => void;
  coverTargets?: CoverTarget[];
}) {
  const refsQuery = useFileReferences(file.id);
  const updateFile = useUpdateFile();
  const updateCollection = useUpdateCollection();
  const deleteFile = useDeleteFile();
  const { replaceFile: runReplace } = useFileReplace();

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
            <div className="text-xs font-medium">Cover art</div>
            <div className="flex flex-wrap gap-2">
              {coverTargets.map((target) => (
                <Button
                  key={target.collectionId}
                  variant="outline"
                  size="sm"
                  onClick={() => setAsCover(target)}
                  disabled={updateCollection.isPending}
                >
                  <ImageIcon className="mr-1 size-4" aria-hidden />
                  Set as {target.label} cover
                </Button>
              ))}
            </div>
          </div>
        )}

        <UsedInSection
          isLoading={refsQuery.isLoading}
          references={refsQuery.data ?? []}
        />
      </div>

      <div className="flex gap-2 border-t border-border px-6 py-4">
        <Button asChild variant="outline">
          <a
            href={publicUrlFor(file.s3Key)}
            download={file.originalFilename}
          >
            <Download className="mr-1 size-4" aria-hidden />
            Download
          </a>
        </Button>
        <Button
          variant="outline"
          onClick={() => replaceInputRef.current?.click()}
        >
          <Replace className="mr-1 size-4" aria-hidden />
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
        <Button
          variant="destructive"
          onClick={onDelete}
          disabled={deleteFile.isPending}
        >
          <Trash2 className="mr-1 size-4" aria-hidden />
          Delete
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
    </>
  );
}

function PreviewArea({ file }: { file: FileRecord }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (file.kind === "image") {
    const thumbUrl = publicUrlFor(file.thumbMdKey ?? file.s3Key);
    const originalUrl = publicUrlFor(file.s3Key);
    return (
      <>
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="block w-full overflow-hidden rounded-md border border-border bg-muted"
          aria-label="Open full-size preview"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbUrl}
            alt={file.altText ?? file.originalFilename}
            className="mx-auto max-h-64 w-auto object-contain"
          />
        </button>
        <Lightbox
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          src={originalUrl}
          alt={file.altText ?? file.originalFilename}
        />
      </>
    );
  }
  if (file.kind === "video") {
    return (
      <video
        controls
        src={publicUrlFor(file.s3Key)}
        className="w-full rounded-md border border-border"
      />
    );
  }
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-muted p-6">
      <div className="text-sm font-medium">{file.originalFilename}</div>
      <Button asChild variant="outline">
        <a
          href={publicUrlFor(file.s3Key)}
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

function Lightbox({
  open,
  onClose,
  src,
  alt,
}: {
  open: boolean;
  onClose: () => void;
  src: string;
  alt: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        // Override the default dialog max-width so the image can breathe.
        className="flex h-[90vh] max-w-[95vw] flex-col gap-0 border-0 bg-black/90 p-0 sm:max-w-[95vw]"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Full-size preview</DialogTitle>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-background/90 p-2 text-foreground hover:bg-background"
          aria-label="Close preview"
        >
          <X className="size-4" aria-hidden />
        </button>
        <div
          className="flex flex-1 items-center justify-center p-6"
          onClick={onClose}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </DialogContent>
    </Dialog>
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
                    className="text-primary hover:underline"
                  >
                    Open page →
                  </a>
                  <a
                    href={`/web/editor${ref.pageId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
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

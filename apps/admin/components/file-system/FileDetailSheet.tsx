"use client";

import { Download, ExternalLink, Pencil, Replace, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useDeleteFile,
  useFile,
  useFileReferences,
  useUpdateFile,
} from "@/lib/files/file-system-hooks";
import { useFileReplace } from "@/lib/files/useFileReplace";
import type { FileRecord, Reference } from "@/lib/db/file-system-types";
import { DeleteBlockedDialog } from "./DeleteBlockedDialog";
import { formatBytes } from "./format";
import { publicUrlFor } from "./thumb-url";

/**
 * Slide-in detail panel that shows metadata + actions for a single file.
 *
 * Clicking another file in the parent view replaces the sheet content — no
 * prev/next arrows, per the plan. The inner body is keyed on the file id so
 * local draft state initializes cleanly when the user switches files
 * without fighting a "setState inside useEffect" pattern.
 */
export type FileDetailSheetProps = {
  fileId: string | null;
  onClose: () => void;
};

export function FileDetailSheet({ fileId, onClose }: FileDetailSheetProps) {
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
      <SheetContent side="right" className="flex w-full max-w-lg flex-col gap-4">
        <SheetHeader>
          <SheetTitle>File details</SheetTitle>
          <SheetDescription>
            Metadata and actions for the selected file.
          </SheetDescription>
        </SheetHeader>

        {fileQuery.isLoading && (
          <div className="space-y-3">
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
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function FileDetailBody({
  file,
  onClose,
}: {
  file: FileRecord;
  onClose: () => void;
}) {
  const refsQuery = useFileReferences(file.id);
  const updateFile = useUpdateFile();
  const deleteFile = useDeleteFile();
  const { replaceFile: runReplace } = useFileReplace();

  const [blockers, setBlockers] = useState<Reference[] | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(file.originalFilename);
  const [altDraft, setAltDraft] = useState(file.altText ?? "");
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const commitName = () => {
    const next = nameDraft.trim();
    if (!next || next === file.originalFilename) {
      setEditingName(false);
      return;
    }
    updateFile.mutate({
      fileId: file.id,
      patch: { originalFilename: next },
    });
    setEditingName(false);
  };

  const commitAlt = () => {
    const next = altDraft.trim();
    if (next === (file.altText ?? "")) return;
    updateFile.mutate({
      fileId: file.id,
      patch: { altText: next || null },
    });
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
                  Uploaded {new Date(file.uploadedAt).toLocaleString()} by
                  Someone
                </div>
              </div>

              {file.kind === "image" && (
                <div className="space-y-1">
                  <label
                    htmlFor="file-alt-text"
                    className="text-xs font-medium"
                  >
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

              <UsedInSection
                isLoading={refsQuery.isLoading}
                references={refsQuery.data ?? []}
              />

              <div className="mt-auto flex gap-2 border-t border-border pt-3">
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
  if (file.kind === "image") {
    const url = publicUrlFor(file.thumbMdKey ?? file.s3Key);
    return (
      <div className="overflow-hidden rounded-md border border-border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={file.altText ?? file.originalFilename}
          className="mx-auto max-h-64 w-auto object-contain"
        />
      </div>
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

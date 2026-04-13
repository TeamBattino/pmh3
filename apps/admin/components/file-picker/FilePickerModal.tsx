"use client";

import { useMemo, useState } from "react";
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
import { FileGrid } from "@/components/file-system/FileGrid";
import { FileUploadZone } from "@/components/file-system/FileUploadZone";
import { FolderTree } from "@/components/documents/FolderTree";
import {
  useCollectionFiles,
  useCollectionTree,
  useFolderFiles,
  useFolderTree,
} from "@/lib/files/file-system-hooks";
import type {
  MediaRef,
  DocumentRef,
  PickerConfig,
  PickerSelection,
} from "@pfadipuck/puck-web/fields/file-picker-context";

/**
 * Picker modal invoked from Puck custom fields via `FilePickerProvider`.
 *
 * The resolving promise is owned by the provider — the modal is
 * stateless apart from its current container selection, the in-modal
 * selection tray, and the upload zone target (which is always CMS Uploads
 * for v1, per section 12.4).
 */
export type FilePickerModalProps = {
  open: boolean;
  config: PickerConfig | null;
  onCancel: () => void;
  onConfirm: (selection: PickerSelection) => void;
};

export function FilePickerModal({
  open,
  config,
  onCancel,
  onConfirm,
}: FilePickerModalProps) {
  if (!config) return null;
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="flex h-[calc(100%-2rem)] max-h-[calc(100%-2rem)] flex-col sm:max-w-5xl lg:max-w-6xl">
        <DialogHeader>
          <DialogTitle>
            {config.pool === "media" ? "Select media" : "Select document"}
          </DialogTitle>
          <DialogDescription>
            {config.mode === "single"
              ? "Pick one file."
              : "Pick one or more files."}
            {config.pool === "media" && config.allowCollection
              ? " You can also select a whole album."
              : ""}
          </DialogDescription>
        </DialogHeader>
        {config.pool === "media" ? (
          <MediaPickerBody
            config={config}
            onCancel={onCancel}
            onConfirm={onConfirm}
          />
        ) : (
          <DocumentsPickerBody
            config={config}
            onCancel={onCancel}
            onConfirm={onConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function MediaPickerBody({
  config,
  onCancel,
  onConfirm,
}: {
  config: Extract<PickerConfig, { pool: "media" }>;
  onCancel: () => void;
  onConfirm: (selection: PickerSelection) => void;
}) {
  const { data: collections = [], isLoading: loadingTree } =
    useCollectionTree();
  const systemAlbum = collections.find((c) => c.isSystemAlbum) ?? null;
  const [albumId, setAlbumId] = useState<string | null>(null);
  const effectiveId = albumId ?? systemAlbum?.id ?? null;
  const { data: files = [], isLoading: loadingFiles } = useCollectionFiles(
    effectiveId
  );

  const visibleFiles = useMemo(() => {
    if (!config.acceptKinds || config.acceptKinds.length === 0) return files;
    return files.filter((f) => config.acceptKinds!.includes(f.kind));
  }, [files, config.acceptKinds]);

  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<
    Set<string>
  >(new Set());

  const toggleFile = (id: string) =>
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (config.mode === "single") next.clear();
        next.add(id);
      }
      return next;
    });
  const toggleCollection = (id: string) =>
    setSelectedCollectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const confirm = () => {
    const refs: MediaRef[] = [
      ...Array.from(selectedFileIds).map(
        (fileId) => ({ type: "file", fileId }) satisfies MediaRef
      ),
      ...Array.from(selectedCollectionIds).map(
        (collectionId) =>
          ({ type: "collection", collectionId }) satisfies MediaRef
      ),
    ];
    onConfirm({ pool: "media", refs });
  };

  const totalSelected = selectedFileIds.size + selectedCollectionIds.size;

  const uploadAlbumId = effectiveId ?? systemAlbum?.id ?? null;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex min-h-0 flex-1 flex-col gap-3 md:grid md:grid-cols-[220px_1fr]">
        <aside className="flex h-[7.5rem] shrink-0 flex-col gap-1 overflow-y-auto rounded-md border border-border p-2 text-sm md:h-auto">
          {loadingTree ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <>
              {systemAlbum && (
                <button
                  type="button"
                  onClick={() => setAlbumId(systemAlbum.id)}
                  className={`shrink-0 truncate rounded px-2 py-1 text-left hover:bg-accent ${
                    effectiveId === systemAlbum.id
                      ? "bg-accent font-medium"
                      : ""
                  }`}
                >
                  CMS Uploads
                </button>
              )}
              <div className="my-1 shrink-0 border-t border-border" aria-hidden />
              {collections
                .filter((c) => c.type === "album_collection")
                .map((ac) => (
                  <div key={ac.id} className="mb-1 shrink-0">
                    <div className="truncate px-2 py-1 text-xs font-semibold text-muted-foreground">
                      {ac.title}
                    </div>
                    {collections
                      .filter((c) => c.type === "album" && c.parentId === ac.id)
                      .map((album) => (
                        <div
                          key={album.id}
                          className="flex min-w-0 items-center gap-1 px-2"
                        >
                          {config.allowCollection && (
                            <input
                              type="checkbox"
                              aria-label={`Select whole album ${album.title}`}
                              checked={selectedCollectionIds.has(album.id)}
                              onChange={() => toggleCollection(album.id)}
                              className="accent-admin-primary"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => setAlbumId(album.id)}
                            title={album.title}
                            className={`min-w-0 flex-1 truncate rounded py-1 text-left text-sm hover:bg-accent ${
                              effectiveId === album.id
                                ? "bg-accent font-medium"
                                : ""
                            }`}
                          >
                            {album.title}
                          </button>
                        </div>
                      ))}
                  </div>
                ))}
            </>
          )}
        </aside>
        <div className="flex min-h-0 flex-col overflow-hidden rounded-md border border-border">
          {loadingFiles ? (
            <div className="p-4">
              <Skeleton className="h-40 w-full" />
            </div>
          ) : visibleFiles.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {files.length === 0
                ? "No files in this album."
                : "No files in this album match the allowed types."}
            </div>
          ) : (
            <FileGrid
              files={visibleFiles}
              selectedIds={selectedFileIds}
              onToggleSelect={toggleFile}
              onOpen={(f) => toggleFile(f.id)}
              tileSize={140}
            />
          )}
        </div>
      </div>
      {uploadAlbumId && (
        <FileUploadZone
          pool={{ kind: "media", albumId: uploadAlbumId }}
          appearance="bar"
        />
      )}
      <DialogFooter>
        <span className="mr-auto text-xs text-muted-foreground">
          {totalSelected} selected
        </span>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={confirm} disabled={totalSelected === 0}>
          Confirm
        </Button>
      </DialogFooter>
    </div>
  );
}

function DocumentsPickerBody({
  config,
  onCancel,
  onConfirm,
}: {
  config: Extract<PickerConfig, { pool: "documents" }>;
  onCancel: () => void;
  onConfirm: (selection: PickerSelection) => void;
}) {
  const { data: folders = [], isLoading: loadingTree } = useFolderTree();
  const systemFolder = folders.find((f) => f.isSystemFolder) ?? null;
  const [folderId, setFolderId] = useState<string | null>(null);
  const effectiveId = folderId ?? systemFolder?.id ?? null;
  const { data: files = [], isLoading: loadingFiles } = useFolderFiles(
    effectiveId
  );

  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(
    new Set()
  );
  const toggleFile = (id: string) =>
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (config.mode === "single") next.clear();
        next.add(id);
      }
      return next;
    });

  const filtered = useMemo(() => {
    if (!config.acceptMimeTypes || config.acceptMimeTypes.length === 0)
      return files;
    return files.map((f) => ({
      ...f,
      _dimmed: !config.acceptMimeTypes!.includes(f.mimeType),
    }));
  }, [files, config.acceptMimeTypes]);

  const confirm = () => {
    const refs: DocumentRef[] = Array.from(selectedFileIds).map((fileId) => ({
      type: "file",
      fileId,
    }));
    onConfirm({ pool: "documents", refs });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex min-h-0 flex-1 flex-col gap-3 md:grid md:grid-cols-[220px_1fr]">
        <aside className="flex h-[7.5rem] shrink-0 flex-col gap-1 overflow-y-auto rounded-md border border-border p-2 text-sm md:h-auto">
          {loadingTree ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <FolderTree
              folders={folders}
              selectedId={effectiveId}
              onSelect={setFolderId}
            />
          )}
        </aside>
        <div className="flex min-h-0 flex-col overflow-hidden rounded-md border border-border">
          {loadingFiles ? (
            <div className="p-4">
              <Skeleton className="h-40 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No files in this folder.
            </div>
          ) : (
            <FileGrid
              files={filtered}
              selectedIds={selectedFileIds}
              onToggleSelect={toggleFile}
              onOpen={(f) => toggleFile(f.id)}
              tileSize={140}
            />
          )}
        </div>
      </div>
      {systemFolder && (
        <FileUploadZone
          pool={{ kind: "documents", folderId: systemFolder.id }}
          appearance="bar"
        />
      )}
      <DialogFooter>
        <span className="mr-auto text-xs text-muted-foreground">
          {selectedFileIds.size} selected
        </span>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={confirm} disabled={selectedFileIds.size === 0}>
          Confirm
        </Button>
      </DialogFooter>
    </div>
  );
}

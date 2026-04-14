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
import { bestThumbnailUrl } from "@/components/file-system/thumb-url";
import { Image as ImageIcon, Lock } from "lucide-react";
import {
  useAlbumFileCounts,
  useCollectionFiles,
  useCollectionTree,
  useFile,
  useFolderFiles,
  useFolderTree,
} from "@/lib/files/file-system-hooks";
import type { CollectionRecord } from "@/lib/db/file-system-types";
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
        {config.pool === "media" && config.albumOnly ? (
          <AlbumPickerBody
            config={config}
            onCancel={onCancel}
            onConfirm={onConfirm}
          />
        ) : config.pool === "media" ? (
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
    let next = files;
    // Single-select mode never offers password-protected files — they can
    // only appear inside a Gallery via an album reference.
    if (config.mode === "single") {
      next = next.filter((f) => !f.passwordProtected);
    }
    if (config.acceptKinds && config.acceptKinds.length > 0) {
      next = next.filter((f) => config.acceptKinds!.includes(f.kind));
    }
    return next;
  }, [files, config.acceptKinds, config.mode]);

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
      else {
        if (config.mode === "single") next.clear();
        next.add(id);
      }
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
                      .filter(
                        (c) =>
                          c.type === "album" &&
                          c.parentId === ac.id &&
                          // Protected albums are hidden from file pickers —
                          // any file inside them is gated on the public site,
                          // so they're not useful selection targets. The
                          // dedicated album picker (`albumOnly`) still shows
                          // them.
                          !c.passwordProtected
                      )
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

function AlbumPickerBody({
  config,
  onCancel,
  onConfirm,
}: {
  config: Extract<PickerConfig, { pool: "media" }>;
  onCancel: () => void;
  onConfirm: (selection: PickerSelection) => void;
}) {
  const { data: collections = [], isLoading } = useCollectionTree();
  const { data: fileCounts = {} } = useAlbumFileCounts();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const groups = useMemo(() => {
    // Exclude the system album ("CMS Uploads") — editors must pick a curated
    // album, not the raw upload dumping ground.
    const albumCollections = collections.filter(
      (c) => c.type === "album_collection"
    );
    return albumCollections.map((ac) => ({
      collection: ac,
      albums: collections.filter(
        (c) => c.type === "album" && c.parentId === ac.id && !c.isSystemAlbum
      ),
    }));
  }, [collections]);

  const confirm = () => {
    if (!selectedId) return;
    onConfirm({
      pool: "media",
      refs: [{ type: "collection", collectionId: selectedId }],
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-border p-3">
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : groups.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No albums yet. Create one from the Media page.
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map(({ collection, albums }) => (
              <section key={collection.id} className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {collection.title}
                </h3>
                {albums.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    No albums.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {albums.map((album) => {
                      const selected = selectedId === album.id;
                      return (
                        <AlbumTile
                          key={album.id}
                          album={album}
                          fileCount={fileCounts[album.id] ?? 0}
                          selected={selected}
                          onClick={() => setSelectedId(album.id)}
                          onDoubleClick={() =>
                            onConfirm({
                              pool: "media",
                              refs: [
                                {
                                  type: "collection",
                                  collectionId: album.id,
                                },
                              ],
                            })
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
      <DialogFooter>
        <span className="mr-auto text-xs text-muted-foreground">
          {selectedId ? "1 album selected" : "No album selected"}
        </span>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={confirm} disabled={!selectedId}>
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

function AlbumTile({
  album,
  fileCount,
  selected,
  onClick,
  onDoubleClick,
}: {
  album: CollectionRecord;
  fileCount: number;
  selected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      aria-pressed={selected}
      className={`group relative flex flex-col overflow-hidden rounded-md border bg-card text-left transition-colors hover:border-admin-primary ${
        selected
          ? "border-admin-primary ring-2 ring-admin-primary"
          : "border-border"
      }`}
    >
      {album.passwordProtected && (
        <div
          className="absolute right-2 top-2 z-10 flex size-5 items-center justify-center rounded bg-background/80 text-foreground shadow"
          title="Password protected"
        >
          <Lock className="size-3" aria-hidden />
        </div>
      )}
      <AlbumTileCover coverFileId={album.coverFileId} />
      <div className="flex flex-col gap-0.5 border-t border-border px-3 py-2">
        <div className="truncate text-sm font-medium">{album.title}</div>
        <div className="text-xs text-muted-foreground">
          {fileCount} file{fileCount === 1 ? "" : "s"}
        </div>
      </div>
    </button>
  );
}

function AlbumTileCover({ coverFileId }: { coverFileId: string | null }) {
  const { data: file } = useFile(coverFileId);
  if (file && file.kind === "image") {
    return (
      <div className="aspect-square w-full overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bestThumbnailUrl(file)}
          alt={file.altText ?? file.originalFilename}
          className="size-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }
  return (
    <div className="flex aspect-square items-center justify-center bg-muted text-muted-foreground">
      <ImageIcon className="size-10" aria-hidden />
    </div>
  );
}

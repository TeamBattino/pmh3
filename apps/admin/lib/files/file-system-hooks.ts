"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query";
import * as actions from "@/lib/db/file-system-actions";
import type {
  CascadeDeletePreview,
  CollectionRecord,
  CreateCollectionInput,
  CreateFolderInput,
  FileRecord,
  FolderRecord,
  PageArgs,
  Reference,
  SearchQuery,
  UpdateCollectionPatch,
  UpdateFilePatch,
  UpdateFolderPatch,
} from "@/lib/db/file-system-types";

/**
 * React Query hooks that wrap the `file-system-actions` server actions.
 *
 * Split out into a separate file because a file that declares `'use server'`
 * at the top cannot also export React hooks — the two directives are
 * incompatible in the same module.
 */

// ── Query keys ─────────────────────────────────────────────────────────

export const fileSystemKeys = {
  tree: () => ["fs", "tree"] as const,
  folderTree: () => ["fs", "folderTree"] as const,
  collectionTree: () => ["fs", "collectionTree"] as const,
  folderFiles: (folderId: string, page: PageArgs) =>
    ["fs", "folderFiles", folderId, page] as const,
  collectionFiles: (collectionId: string, page: PageArgs) =>
    ["fs", "collectionFiles", collectionId, page] as const,
  file: (fileId: string) => ["fs", "file", fileId] as const,
  fileReferences: (fileId: string) => ["fs", "fileReferences", fileId] as const,
  fileSearch: (query: SearchQuery) => ["fs", "fileSearch", query] as const,
  albumFileCounts: () => ["fs", "albumFileCounts"] as const,
  fileAlbumCount: (fileId: string) => ["fs", "fileAlbumCount", fileId] as const,
};

// ── Reads ──────────────────────────────────────────────────────────────

export function useTree(
  options?: Omit<
    UseQueryOptions<{ folders: FolderRecord[]; collections: CollectionRecord[] }>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: fileSystemKeys.tree(),
    queryFn: () => actions.getTree(),
    ...options,
  });
}

export function useFolderTree(
  options?: Omit<
    UseQueryOptions<FolderRecord[]>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: fileSystemKeys.folderTree(),
    queryFn: () => actions.getFolderTree(),
    ...options,
  });
}

export function useCollectionTree() {
  return useQuery({
    queryKey: fileSystemKeys.collectionTree(),
    queryFn: () => actions.getCollectionTree(),
  });
}

export function useAlbumFileCounts() {
  return useQuery({
    queryKey: fileSystemKeys.albumFileCounts(),
    queryFn: () => actions.getAlbumFileCounts(),
  });
}

export function useFileAlbumCount(fileId: string | null) {
  return useQuery({
    queryKey: fileId ? fileSystemKeys.fileAlbumCount(fileId) : ["fs", "fileAlbumCount", "none"],
    queryFn: () => (fileId ? actions.getFileAlbumCount(fileId) : Promise.resolve(0)),
    enabled: !!fileId,
  });
}

export function useFolderFiles(
  folderId: string | null,
  page: PageArgs = { offset: 0, limit: 50 }
) {
  return useQuery({
    queryKey: folderId
      ? fileSystemKeys.folderFiles(folderId, page)
      : ["fs", "folderFiles", "none"],
    queryFn: () =>
      folderId ? actions.listFolderFiles(folderId, page) : Promise.resolve([]),
    enabled: !!folderId,
  });
}

export function useCollectionFiles(
  collectionId: string | null,
  page: PageArgs = { offset: 0, limit: 50 }
) {
  return useQuery({
    queryKey: collectionId
      ? fileSystemKeys.collectionFiles(collectionId, page)
      : ["fs", "collectionFiles", "none"],
    queryFn: () =>
      collectionId
        ? actions.listCollectionFiles(collectionId, page)
        : Promise.resolve([]),
    enabled: !!collectionId,
  });
}

export function useFile(fileId: string | null) {
  return useQuery({
    queryKey: fileId ? fileSystemKeys.file(fileId) : ["fs", "file", "none"],
    queryFn: () => (fileId ? actions.getFile(fileId) : Promise.resolve(null)),
    enabled: !!fileId,
  });
}

export function useFileReferences(fileId: string | null) {
  return useQuery({
    queryKey: fileId
      ? fileSystemKeys.fileReferences(fileId)
      : ["fs", "fileReferences", "none"],
    queryFn: () =>
      fileId ? actions.getFileReferences(fileId) : Promise.resolve<Reference[]>([]),
    enabled: !!fileId,
  });
}

export function useFileSearch(query: SearchQuery, enabled = true) {
  return useQuery({
    queryKey: fileSystemKeys.fileSearch(query),
    queryFn: () => actions.searchFiles(query),
    enabled,
  });
}

// ── Mutations ──────────────────────────────────────────────────────────

function useInvalidating<TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>,
  keysOf: (args: TArgs) => QueryKey[]
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (_data, args) => {
      for (const key of keysOf(args)) qc.invalidateQueries({ queryKey: key });
    },
  });
}

export function useUpdateFile() {
  return useInvalidating(
    (args: { fileId: string; patch: UpdateFilePatch }) =>
      actions.updateFile(args.fileId, args.patch),
    (args) => [
      fileSystemKeys.file(args.fileId),
      // Parent lists render the filename too, so they must refetch or the
      // user has to navigate away and back to see the new name.
      ["fs", "folderFiles"],
      ["fs", "collectionFiles"],
    ]
  );
}

export function useDeleteFile() {
  return useInvalidating(
    (args: { fileId: string }) => actions.deleteFile(args.fileId),
    (args) => [
      fileSystemKeys.file(args.fileId),
      fileSystemKeys.tree(),
      fileSystemKeys.folderTree(),
      fileSystemKeys.collectionTree(),
      fileSystemKeys.albumFileCounts(),
      fileSystemKeys.fileAlbumCount(args.fileId),
      ["fs", "folderFiles"],
      ["fs", "collectionFiles"],
    ]
  );
}

export function useBulkDeleteFiles() {
  return useInvalidating(
    (args: { fileIds: string[] }) => actions.bulkDeleteFiles(args.fileIds),
    () => [
      fileSystemKeys.tree(),
      fileSystemKeys.albumFileCounts(),
      ["fs", "folderFiles"],
      ["fs", "collectionFiles"],
    ]
  );
}

export function useCreateFolder() {
  return useInvalidating(
    (input: CreateFolderInput) => actions.createFolder(input),
    () => [fileSystemKeys.tree(), fileSystemKeys.folderTree()]
  );
}

export function useUpdateFolder() {
  return useInvalidating(
    (args: { folderId: string; patch: UpdateFolderPatch }) =>
      actions.updateFolder(args.folderId, args.patch),
    () => [fileSystemKeys.tree(), fileSystemKeys.folderTree()]
  );
}

export function useDeleteFolder() {
  return useInvalidating(
    (args: { folderId: string }) => actions.deleteFolder(args.folderId),
    () => [fileSystemKeys.tree(), fileSystemKeys.folderTree()]
  );
}

export function usePreviewCascadeDeleteFolder(folderId: string | null) {
  return useQuery({
    queryKey: folderId
      ? (["fs", "cascadePreview", folderId] as const)
      : (["fs", "cascadePreview", "none"] as const),
    queryFn: () =>
      folderId
        ? actions.previewCascadeDeleteFolder(folderId)
        : Promise.resolve<CascadeDeletePreview | null>(null),
    enabled: !!folderId,
  });
}

export function useCascadeDeleteFolder() {
  return useInvalidating(
    (args: { folderId: string }) => actions.cascadeDeleteFolder(args.folderId),
    () => [
      fileSystemKeys.tree(),
      fileSystemKeys.folderTree(),
      ["fs", "folderFiles"],
      ["fs", "cascadePreview"],
    ]
  );
}

export function useMoveFilesToFolder() {
  return useInvalidating(
    (args: { fileIds: string[]; targetFolderId: string }) =>
      actions.moveFilesToFolder(args.fileIds, args.targetFolderId),
    () => [["fs", "folderFiles"], fileSystemKeys.tree()]
  );
}

export function useCreateCollection() {
  return useInvalidating(
    (input: CreateCollectionInput) => actions.createCollection(input),
    () => [fileSystemKeys.tree(), fileSystemKeys.collectionTree()]
  );
}

export function useUpdateCollection() {
  return useInvalidating(
    (args: { collectionId: string; patch: UpdateCollectionPatch }) =>
      actions.updateCollection(args.collectionId, args.patch),
    () => [fileSystemKeys.tree(), fileSystemKeys.collectionTree()]
  );
}

export function useDeleteCollection() {
  return useInvalidating(
    (args: { collectionId: string }) =>
      actions.deleteCollection(args.collectionId),
    () => [fileSystemKeys.tree(), fileSystemKeys.collectionTree()]
  );
}

export function useAddFilesToAlbum() {
  return useInvalidating(
    (args: { fileIds: string[]; targetAlbumId: string }) =>
      actions.addFilesToAlbum(args.fileIds, args.targetAlbumId),
    (args) => [
      fileSystemKeys.collectionFiles(args.targetAlbumId, {
        offset: 0,
        limit: 50,
      }),
      ["fs", "collectionFiles"],
      fileSystemKeys.tree(),
      fileSystemKeys.albumFileCounts(),
      ...args.fileIds.map((id) => fileSystemKeys.fileAlbumCount(id)),
    ] as QueryKey[]
  );
}

export function useRemoveFilesFromAlbum() {
  return useInvalidating(
    (args: { fileIds: string[]; sourceAlbumId: string }) =>
      actions.removeFilesFromAlbum(args.fileIds, args.sourceAlbumId),
    (args) => [
      fileSystemKeys.collectionFiles(args.sourceAlbumId, {
        offset: 0,
        limit: 50,
      }),
      ["fs", "collectionFiles"],
      fileSystemKeys.tree(),
      fileSystemKeys.albumFileCounts(),
      ...args.fileIds.map((id) => fileSystemKeys.fileAlbumCount(id)),
    ] as QueryKey[]
  );
}

// Re-export FileRecord so call sites can import it from one place.
export type { FileRecord };

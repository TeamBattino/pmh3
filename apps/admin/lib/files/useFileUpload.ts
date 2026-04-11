"use client";

import { useCallback } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import {
  processFileForUpload,
  uploadProcessedFile,
  type UploadPool,
} from "./client-upload";
import { useBackgroundOps } from "@/components/file-system/BackgroundOpsProvider";
import { fileSystemKeys } from "./file-system-hooks";
import type { FileRecord } from "@/lib/db/file-system-types";

/**
 * Wraps the client upload pipeline in a React Query / BackgroundOps-aware
 * hook. Each file registers as its own background op so the editor can keep
 * navigating while uploads run.
 */
export function useFileUpload() {
  const ops = useBackgroundOps();
  const qc = useQueryClient();

  const uploadFiles = useCallback(
    async (files: File[], pool: UploadPool): Promise<FileRecord[]> => {
      const results: FileRecord[] = [];
      for (const file of files) {
        const subtitle =
          pool.kind === "documents"
            ? `to folder ${pool.folderId}`
            : `to album ${pool.albumId}`;
        const invalidateKeys: QueryKey[] = [
          fileSystemKeys.tree(),
          pool.kind === "documents"
            ? ["fs", "folderFiles", pool.folderId]
            : ["fs", "collectionFiles", pool.albumId],
        ];
        const controller = new AbortController();

        const result = await ops.runOperation<FileRecord>(
          {
            kind: "upload",
            title: file.name,
            subtitle,
            progress: 0,
            invalidateKeys,
            cancel: () => controller.abort(),
          },
          async ({ setProgress, update }) => {
            update({ progress: 0 });
            const processed = await processFileForUpload(file);
            const uploaded = await uploadProcessedFile(processed, pool, {
              signal: controller.signal,
              onProgress: (p) => setProgress(p.percent),
            });
            return uploaded;
          }
        );
        results.push(result);
      }
      // Also invalidate eagerly after the batch so views refresh even when a
      // single-file op doesn't include the right keys.
      qc.invalidateQueries({ queryKey: fileSystemKeys.tree() });
      if (pool.kind === "documents")
        qc.invalidateQueries({
          queryKey: ["fs", "folderFiles", pool.folderId],
        });
      else
        qc.invalidateQueries({
          queryKey: ["fs", "collectionFiles", pool.albumId],
        });
      return results;
    },
    [ops, qc]
  );

  return { uploadFiles };
}

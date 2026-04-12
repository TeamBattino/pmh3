"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { processFileForUpload } from "./client-upload";
import { xhrPut } from "./xhr-put";
import {
  presignUpload,
  replaceFile as replaceFileAction,
} from "@/lib/db/file-system-actions";
import { useBackgroundOps } from "@/components/file-system/BackgroundOpsProvider";
import { fileSystemKeys } from "./file-system-hooks";
import type { FileRecord } from "@/lib/db/file-system-types";

/**
 * Runs a file-replace through the background ops dock. Uses the same
 * classify + canvas-resize pipeline as the initial upload, then hands off
 * to the `replaceFile` server action which enforces kind-matching and
 * deletes the old S3 objects.
 *
 * This is a separate hook from `useFileUpload` because replace doesn't
 * write a new DB row — it mutates the existing one and keeps `fileId`
 * stable so every Puck reference to this file continues to resolve.
 */
export function useFileReplace() {
  const ops = useBackgroundOps();
  const qc = useQueryClient();

  const replaceFile = useCallback(
    async (
      current: FileRecord,
      newFile: File
    ): Promise<FileRecord> => {
      const controller = new AbortController();
      return ops.runOperation<FileRecord>(
        {
          kind: "upload",
          title: `Replacing ${current.originalFilename}`,
          progress: 0,
          cancel: () => controller.abort(),
          invalidateKeys: [
            fileSystemKeys.file(current.id),
            fileSystemKeys.tree(),
          ],
        },
        async ({ setProgress }) => {
          const processed = await processFileForUpload(newFile);
          if (processed.kind !== current.kind) {
            throw new Error(
              `Cannot change kind from ${current.kind} to ${processed.kind}`
            );
          }

          const variants = [
            {
              variant: "original" as const,
              contentType: processed.original.contentType,
              keySuffix: processed.original.keySuffix,
            },
            ...(processed.thumbSm
              ? [
                  {
                    variant: "thumb_sm" as const,
                    contentType: processed.thumbSm.contentType,
                    keySuffix: processed.thumbSm.keySuffix,
                  },
                ]
              : []),
            ...(processed.thumbMd
              ? [
                  {
                    variant: "thumb_md" as const,
                    contentType: processed.thumbMd.contentType,
                    keySuffix: processed.thumbMd.keySuffix,
                  },
                ]
              : []),
            ...(processed.thumbLg
              ? [
                  {
                    variant: "thumb_lg" as const,
                    contentType: processed.thumbLg.contentType,
                    keySuffix: processed.thumbLg.keySuffix,
                  },
                ]
              : []),
          ];

          const presigned = await presignUpload({
            variants,
            replaceOf: current.id,
          });
          const byVariant = new Map(
            presigned.uploads.map((u) => [u.variant, u])
          );

          // Progress weighting mirrors useFileUpload.
          const progressByVariant = new Map<string, number>();
          const weights = new Map<string, number>();
          weights.set("original", 0.9);
          if (processed.thumbSm) weights.set("thumb_sm", 0.05);
          if (processed.thumbMd) weights.set("thumb_md", 0.05);
          if (processed.thumbLg) weights.set("thumb_lg", 0.05);
          const total = [...weights.values()].reduce((a, b) => a + b, 0);
          for (const [k, v] of weights) weights.set(k, v / total);

          const bump = () => {
            let p = 0;
            for (const [variant, weight] of weights) {
              p += (progressByVariant.get(variant) ?? 0) * weight;
            }
            setProgress(Math.round(p));
          };

          await Promise.all([
            xhrPut({
              url: byVariant.get("original")!.presignedUrl,
              blob: processed.original.blob,
              contentType: processed.original.contentType,
              signal: controller.signal,
              onProgress: (p) => {
                progressByVariant.set("original", p);
                bump();
              },
            }),
            ...(processed.thumbSm
              ? [
                  xhrPut({
                    url: byVariant.get("thumb_sm")!.presignedUrl,
                    blob: processed.thumbSm.blob,
                    contentType: processed.thumbSm.contentType,
                    signal: controller.signal,
                    onProgress: (p) => {
                      progressByVariant.set("thumb_sm", p);
                      bump();
                    },
                  }),
                ]
              : []),
            ...(processed.thumbMd
              ? [
                  xhrPut({
                    url: byVariant.get("thumb_md")!.presignedUrl,
                    blob: processed.thumbMd.blob,
                    contentType: processed.thumbMd.contentType,
                    signal: controller.signal,
                    onProgress: (p) => {
                      progressByVariant.set("thumb_md", p);
                      bump();
                    },
                  }),
                ]
              : []),
            ...(processed.thumbLg
              ? [
                  xhrPut({
                    url: byVariant.get("thumb_lg")!.presignedUrl,
                    blob: processed.thumbLg.blob,
                    contentType: processed.thumbLg.contentType,
                    signal: controller.signal,
                    onProgress: (p) => {
                      progressByVariant.set("thumb_lg", p);
                      bump();
                    },
                  }),
                ]
              : []),
          ]);

          const record = await replaceFileAction(current.id, {
            mimeType: processed.mimeType,
            sizeBytes: processed.sizeBytes,
            kind: processed.kind,
            width: processed.width,
            height: processed.height,
            blurhash: processed.blurhash,
            keys: {
              original: byVariant.get("original")!.key,
              thumbSm: byVariant.get("thumb_sm")?.key ?? null,
              thumbMd: byVariant.get("thumb_md")?.key ?? null,
              thumbLg: byVariant.get("thumb_lg")?.key ?? null,
            },
          });
          qc.invalidateQueries({ queryKey: fileSystemKeys.file(current.id) });
          return record;
        }
      );
    },
    [ops, qc]
  );

  return { replaceFile };
}

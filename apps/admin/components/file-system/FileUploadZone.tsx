"use client";

import { Upload } from "lucide-react";
import { useCallback, useRef, useState, type DragEvent } from "react";
import { cn } from "@/lib/cn";
import { useFileUpload } from "@/lib/files/useFileUpload";
import type { UploadPool } from "@/lib/files/client-upload";

/**
 * Drop target + click-to-upload button that hands every dropped/selected
 * file to `useFileUpload` → which in turn registers each file as a
 * background op.
 */
export type FileUploadZoneProps = {
  pool: UploadPool;
  /** "collapsed bar" = default appearance, "button" = compact. */
  appearance?: "bar" | "button";
  className?: string;
  disabled?: boolean;
};

export function FileUploadZone({
  pool,
  appearance = "bar",
  className,
  disabled,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const { uploadFiles } = useFileUpload();

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      uploadFiles(Array.from(files), pool).catch((err) => {
        console.error("Upload failed", err);
      });
    },
    [uploadFiles, pool]
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  if (appearance === "button") {
    return (
      <>
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50",
            className
          )}
        >
          <Upload className="size-4" aria-hidden />
          Upload
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={openPicker}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPicker();
        }
      }}
      aria-disabled={disabled}
      className={cn(
        "flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-border p-4 text-sm text-muted-foreground transition-colors",
        dragging && "border-primary bg-primary/5 text-primary",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <Upload className="size-4" aria-hidden />
      <span>
        {dragging ? "Drop to upload" : "Drop files here, or click to upload"}
      </span>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

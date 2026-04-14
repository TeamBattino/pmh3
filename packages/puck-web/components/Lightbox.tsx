"use client";

import { useEffect } from "react";
import type { AlbumItem } from "../fields/file-picker-types";

export type LightboxProps = {
  items: AlbumItem[];
  index: number | null;
  onClose: () => void;
  onChange: (next: number) => void;
};

export function Lightbox({ items, index, onClose, onChange }: LightboxProps) {
  const open = index !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") {
        if (index !== null && index < items.length - 1) onChange(index + 1);
      }
      if (e.key === "ArrowLeft") {
        if (index !== null && index > 0) onChange(index - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, items.length, onChange, onClose]);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  if (!open || index === null) return null;
  const item = items[index];
  if (!item || item.locked) return null;

  const canPrev = index > 0;
  const canNext = index < items.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="Close"
      >
        <Glyph d="M18 6 6 18 M6 6l12 12" />
      </button>

      {canPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(index - 1);
          }}
          className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
          aria-label="Previous"
        >
          <Glyph d="m15 18-6-6 6-6" />
        </button>
      )}
      {canNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(index + 1);
          }}
          className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
          aria-label="Next"
        >
          <Glyph d="m9 18 6-6-6-6" />
        </button>
      )}

      <div
        className="relative flex max-h-[100dvh] max-w-[100dvw] items-center justify-center p-6"
        onClick={(e) => e.stopPropagation()}
        style={{ touchAction: "pinch-zoom" }}
      >
        {item.kind === "video" ? (
          <video
            key={item.fileId}
            src={item.videoUrl ?? undefined}
            poster={
              item.urls?.lg ??
              item.urls?.md ??
              item.posterUrl ??
              undefined
            }
            controls
            autoPlay
            playsInline
            className="max-h-[90dvh] max-w-[95dvw]"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={item.fileId}
            src={item.urls?.lg ?? item.urls?.md ?? ""}
            alt={item.alt ?? ""}
            className="max-h-[90dvh] max-w-[95dvw] object-contain"
          />
        )}
        {item.alt && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/60 px-3 py-1 text-xs text-white">
            {item.alt}
          </div>
        )}
      </div>
    </div>
  );
}

function Glyph({ d }: { d: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

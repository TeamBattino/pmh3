"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AlbumItem,
  ResolvedAlbum,
} from "../fields/file-picker-types";
import { Lightbox } from "./Lightbox";
import { UnlockModal } from "./UnlockModal";

export type GalleryClientProps = {
  album: ResolvedAlbum;
  layout: "grid" | "carousel";
};

type SignedFileUrls = {
  fileId: string;
  sm: string | null;
  md: string | null;
  lg: string | null;
  posterUrl: string | null;
  videoUrl: string | null;
};

export function GalleryClient({ album, layout }: GalleryClientProps) {
  const [unlockedUrls, setUnlockedUrls] = useState<
    Record<string, SignedFileUrls>
  >({});
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const items = useMemo<AlbumItem[]>(
    () =>
      album.items.map((item) => {
        if (!item.locked) return item;
        const u = unlockedUrls[item.fileId];
        if (!u) return item;
        return {
          ...item,
          locked: false,
          urls: { sm: u.sm, md: u.md, lg: u.lg },
          posterUrl: u.posterUrl,
          videoUrl: u.videoUrl,
        };
      }),
    [album.items, unlockedUrls]
  );

  const lockedIds = useMemo(
    () => album.items.filter((i) => i.locked).map((i) => i.fileId),
    [album.items]
  );

  const onUnlocked = useCallback(async () => {
    if (lockedIds.length === 0) return;
    try {
      const res = await fetch("/api/media/sign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileIds: lockedIds }),
      });
      const data = (await res.json()) as { items: SignedFileUrls[] };
      const next: Record<string, SignedFileUrls> = {};
      for (const item of data.items) next[item.fileId] = item;
      setUnlockedUrls(next);
    } catch {
      // User can retry by opening a tile again.
    }
  }, [lockedIds]);

  const openItem = (idx: number) => {
    const item = items[idx];
    if (!item) return;
    if (item.locked) {
      setUnlockOpen(true);
      return;
    }
    setLightboxIndex(idx);
  };

  return (
    <>
      {layout === "grid" ? (
        <GalleryGrid items={items} onOpen={openItem} />
      ) : (
        <GalleryCarousel items={items} onOpen={openItem} />
      )}

      <UnlockModal
        open={unlockOpen}
        onClose={() => setUnlockOpen(false)}
        onUnlocked={async () => {
          setUnlockOpen(false);
          await onUnlocked();
        }}
      />

      <Lightbox
        items={items}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onChange={setLightboxIndex}
      />
    </>
  );
}

function GalleryGrid({
  items,
  onOpen,
}: {
  items: AlbumItem[];
  onOpen: (idx: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {items.map((item, idx) => (
        <Tile
          key={item.fileId}
          item={item}
          onClick={() => onOpen(idx)}
          className="aspect-square"
        />
      ))}
    </div>
  );
}

/**
 * Cinematic carousel: 16/9 stage with a single active slide, neighbours
 * peeking ~8% on each side. Each slide fills its frame via `object-contain`,
 * with the slide's own blurhash blurred and scaled to fill the letterbox
 * backdrop — portrait + landscape + square images all look intentional.
 *
 * Interactions:
 *   - Drag / swipe (mouse + touch) to scrub between slides; snaps on
 *     release with a velocity-aware threshold.
 *   - Prev / next buttons appear on hover (always visible on touch).
 *   - ← → keys when the carousel has focus.
 *   - Clicking the active slide opens the lightbox.
 *   - Thumbnail strip beneath for quick jumping.
 */
function GalleryCarousel({
  items,
  onOpen,
}: {
  items: AlbumItem[];
  onOpen: (idx: number) => void;
}) {
  const [active, setActive] = useState(0);
  const [drag, setDrag] = useState<{ startX: number; dx: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const thumbStripRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, items.length - 1)));
  }, [items.length]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;
      if (e.key === "ArrowRight") {
        setActive((a) => Math.min(a + 1, items.length - 1));
      } else if (e.key === "ArrowLeft") {
        setActive((a) => Math.max(a - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items.length]);

  // Keep the active thumbnail visible inside the hidden-scrollbar strip.
  // Skip the initial mount so a below-the-fold gallery doesn't smooth-scroll
  // the window down to itself on page load. Scroll the strip manually
  // instead of scrollIntoView, which would also move the window.
  const didMountRef = useRef(false);
  useEffect(() => {
    const strip = thumbStripRef.current;
    if (!strip) return;
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    const el = strip.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    if (!el) return;
    const stripRect = strip.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const delta =
      elRect.left - stripRect.left - (stripRect.width - elRect.width) / 2;
    strip.scrollBy({ left: delta, behavior: "smooth" });
  }, [active]);

  if (items.length === 0) return null;

  const go = (next: number) =>
    setActive(Math.max(0, Math.min(items.length - 1, next)));

  // Each slide takes 84% of the stage, leaving 8% peek on each side.
  // On narrow viewports the peek eats too much of the active image, so
  // give the slide nearly the whole stage (96%) below ~640px.
  const slideRatio = width < 640 ? 0.96 : 0.84;
  const slideW = width * slideRatio;
  const gap = width * 0.02;
  const stride = slideW + gap;
  // Translate so slide `active` is centered.
  const baseOffset = (width - slideW) / 2 - active * stride;
  const translate = baseOffset + (drag?.dx ?? 0);
  const dragging = drag !== null;

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDrag({ startX: e.clientX, dx: 0 });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    setDrag({ ...drag, dx: e.clientX - drag.startX });
  };
  const onPointerUp = () => {
    if (!drag) return;
    const threshold = width * 0.18;
    if (drag.dx > threshold) go(active - 1);
    else if (drag.dx < -threshold) go(active + 1);
    setDrag(null);
  };

  const activeItem = items[active];

  return (
    <div
      ref={containerRef}
      className="group relative w-full select-none"
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label={activeItem?.alt ?? "Gallery"}
    >
      {/* Stage */}
      <div
        className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-black"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {width > 0 && (
          <div
            className="absolute inset-y-0 left-0 flex h-full items-stretch"
            style={{
              transform: `translate3d(${translate}px, 0, 0)`,
              transition: dragging
                ? "none"
                : "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)",
              willChange: "transform",
            }}
          >
            {items.map((item, idx) => {
              const isActive = idx === active;
              return (
                <div
                  key={item.fileId}
                  className="relative h-full shrink-0"
                  style={{
                    width: `${slideW}px`,
                    marginRight: idx < items.length - 1 ? `${gap}px` : 0,
                  }}
                  aria-hidden={!isActive}
                >
                  <Slide
                    item={item}
                    active={isActive}
                    onActivate={() => {
                      if (drag !== null) return;
                      if (isActive) onOpen(idx);
                      else go(idx);
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Caption overlay */}
        {activeItem?.alt && !activeItem.locked && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
            <div className="text-sm">{activeItem.alt}</div>
          </div>
        )}

        {/* Counter */}
        <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs text-white backdrop-blur">
          {active + 1} / {items.length}
        </div>

        {/* Arrows — visible on hover, always-on for touch */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            go(active - 1);
          }}
          disabled={active === 0}
          aria-label="Previous"
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur transition hover:bg-white/20 focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-20 md:p-3.5 md:opacity-0 md:group-hover:opacity-100"
        >
          <Chevron d="m15 18-6-6 6-6" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            go(active + 1);
          }}
          disabled={active === items.length - 1}
          aria-label="Next"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur transition hover:bg-white/20 focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-20 md:p-3.5 md:opacity-0 md:group-hover:opacity-100"
        >
          <Chevron d="m9 18 6-6-6-6" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-0.5 w-full overflow-hidden rounded-full bg-contrast-ground/10">
        <div
          className="h-full rounded-full bg-contrast-ground/60 transition-all duration-500"
          style={{
            width: `${((active + 1) / items.length) * 100}%`,
          }}
        />
      </div>

      {/* Thumbnail strip */}
      <div
        ref={thumbStripRef}
        className="carousel-thumbs mt-3 overflow-x-auto px-1 py-1"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style>{`.carousel-thumbs::-webkit-scrollbar { display: none; }`}</style>
        <div className="mx-auto flex w-max gap-2">
          {items.map((item, idx) => (
            <button
              key={item.fileId}
              type="button"
              data-idx={idx}
              onClick={() => go(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`relative aspect-square w-16 shrink-0 overflow-hidden rounded-md transition-all ${
                idx === active
                  ? "ring-2 ring-contrast-ground/70"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              <ThumbImage item={item} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ThumbImage({ item }: { item: AlbumItem }) {
  if (item.locked) {
    return (
      <div className="relative size-full bg-elevated">
        {item.blurhash && (
          <BlurhashCanvas
            hash={item.blurhash}
            className="absolute inset-0 size-full object-cover"
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
          <LockGlyph />
        </div>
      </div>
    );
  }
  const src = item.urls?.sm ?? item.urls?.md ?? item.posterUrl ?? null;
  if (!src) {
    return (
      <div className="relative size-full bg-elevated">
        {item.blurhash && (
          <BlurhashCanvas
            hash={item.blurhash}
            className="absolute inset-0 size-full object-cover"
          />
        )}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="size-full object-cover"
      loading="lazy"
    />
  );
}

function Slide({
  item,
  active,
  onActivate,
}: {
  item: AlbumItem;
  active: boolean;
  onActivate: () => void;
}) {
  const url = item.urls?.lg ?? item.urls?.md ?? null;
  // For videos: prefer the lg thumb (new pipeline) and fall back to the
  // legacy `_poster.webp` for files uploaded before thumbs were generated.
  const poster = url ?? item.posterUrl;
  return (
    <div
      className={`relative size-full cursor-pointer transition-[filter,opacity,transform] duration-500 ${
        active
          ? ""
          : "pointer-events-none scale-[0.94] opacity-30 brightness-50"
      }`}
      onClick={onActivate}
      role="group"
      aria-roledescription="slide"
    >
      {/* Blurred backdrop from the same image. For locked slides it IS the
          surface (full strength); for unlocked slides it fills the letterbox
          behind an object-contain image. */}
      {item.blurhash && (
        <BlurhashCanvas
          hash={item.blurhash}
          className={
            item.locked
              ? "absolute inset-0 size-full object-cover"
              : "absolute inset-0 size-full scale-110 object-cover opacity-60 blur-2xl"
          }
        />
      )}

      {item.locked ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/10 via-black/30 to-black/50 text-white">
          <div className="flex flex-col items-center gap-2 rounded-full bg-black/40 px-5 py-4 backdrop-blur-sm">
            <LockGlyph />
            <span className="text-xs font-medium">Click to unlock</span>
          </div>
        </div>
      ) : item.kind === "video" ? (
        <>
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={poster}
              alt={item.alt ?? ""}
              className="absolute inset-0 size-full object-contain"
              draggable={false}
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-black/50 p-6 text-white backdrop-blur-sm">
              <PlayGlyph />
            </div>
          </div>
        </>
      ) : url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={item.alt ?? ""}
          className="absolute inset-0 size-full object-contain"
          draggable={false}
        />
      ) : null}
    </div>
  );
}

function Tile({
  item,
  onClick,
  className,
}: {
  item: AlbumItem;
  onClick: () => void;
  className?: string;
}) {
  const thumb = item.urls?.md ?? item.urls?.sm ?? null;
  // Videos: prefer the generated thumb; legacy uploads fall back to
  // `posterKey`'s signed URL.
  const poster = thumb ?? item.posterUrl;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group relative w-full cursor-pointer overflow-hidden rounded-md bg-elevated ${className ?? ""}`}
      aria-label={item.alt ?? item.fileId}
    >
      {item.blurhash && (
        <BlurhashCanvas
          hash={item.blurhash}
          className="absolute inset-0 size-full object-cover"
        />
      )}
      {item.locked ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent via-black/10 to-black/40 text-white">
          <div className="rounded-full bg-black/50 p-2 backdrop-blur-sm">
            <LockGlyph />
          </div>
        </div>
      ) : item.kind === "video" ? (
        <>
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={poster}
              alt={item.alt ?? ""}
              className="absolute inset-0 size-full object-cover"
              loading="lazy"
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <PlayGlyph />
          </div>
        </>
      ) : thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt={item.alt ?? ""}
          className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : null}
    </div>
  );
}

function BlurhashCanvas({
  hash,
  className,
}: {
  hash: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { decode } = await import("blurhash");
        const W = 32;
        const H = 32;
        const pixels = decode(hash, W, H);
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const imageData = ctx.createImageData(W, H);
        imageData.data.set(pixels);
        ctx.putImageData(imageData, 0, 0);
        if (!cancelled) setSrc(canvas.toDataURL());
      } catch {
        // Bad hash → silently render nothing.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hash]);

  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" aria-hidden className={className} />;
}

function LockGlyph() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-8 drop-shadow"
      aria-hidden
    >
      <rect width="18" height="11" x="3" y="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-12 text-white drop-shadow"
      aria-hidden
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function Chevron({ d }: { d: string }) {
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

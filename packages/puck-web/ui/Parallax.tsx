"use client";
import { useEffect, useRef } from "react";
import Layer1 from "../../graphics/src/parallax-layers/Layer1.svg";
import Layer2 from "../../graphics/src/parallax-layers/Layer2.svg";
import Layer3 from "../../graphics/src/parallax-layers/Layer3.svg";
import Layer4 from "../../graphics/src/parallax-layers/Layer4.svg";
import Layer5 from "../../graphics/src/parallax-layers/Layer5.svg";
import Layer6 from "../../graphics/src/parallax-layers/Layer6.svg";
import Layer7 from "../../graphics/src/parallax-layers/Layer7.svg";
import Mobile from "../../graphics/src/parallax-layers/MobileCombined.svg";

type LayerSpec = { src: string; translateY: [number, number] };

// translateY is [start%, end%] of the layer's own height, applied as
// `translate3d(0, Y%, 0)`. Progress goes 0→1 over one full banner-scroll,
// so ranges here are ~half what react-scroll-parallax used (which spread
// its 0→1 over viewport+banner of scroll). Tweak per-layer to taste.
const LAYERS: LayerSpec[] = [
  { src: Layer1.src, translateY: [-6, 34] },
  { src: Layer2.src, translateY: [-6, 30] },
  { src: Layer3.src, translateY: [-6, 26] },
  { src: Layer4.src, translateY: [0, 24] },
  { src: Layer5.src, translateY: [1, 19] },
  { src: Layer6.src, translateY: [3, 15] },
  { src: Layer7.src, translateY: [0, 0] },
];

function Parallax() {
  const bannerRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    const banner = bannerRef.current;
    if (!banner) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const applyStatic = (progress: number) => {
      for (let i = 0; i < LAYERS.length; i++) {
        const el = layerRefs.current[i];
        if (!el) continue;
        const [start, end] = LAYERS[i].translateY;
        const y = start + (end - start) * progress;
        el.style.transform = `translate3d(0, ${y}%, 0)`;
      }
    };

    if (reduced.matches) {
      applyStatic(0);
      return;
    }

    // Cache the scroll endpoint (document-Y of banner's bottom edge) so the
    // per-frame update doesn't need a layout-forcing getBoundingClientRect.
    let endScroll = 0;
    const measure = () => {
      const rect = banner.getBoundingClientRect();
      endScroll = rect.bottom + window.scrollY;
    };

    let rafId = 0;
    let ticking = false;
    let active = false;

    const update = () => {
      ticking = false;
      const progress =
        endScroll > 0
          ? Math.max(0, Math.min(1, window.scrollY / endScroll))
          : 0;
      applyStatic(progress);
    };

    const onScroll = () => {
      if (ticking || !active) return;
      ticking = true;
      rafId = requestAnimationFrame(update);
    };

    const onResize = () => {
      measure();
      onScroll();
    };

    // Only run the scroll loop while the banner is actually on screen.
    const io = new IntersectionObserver(
      (entries) => {
        active = entries[0]?.isIntersecting ?? false;
        if (active) onScroll();
      },
      { rootMargin: "0px" },
    );
    io.observe(banner);

    measure();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("load", onResize);
    return () => {
      cancelAnimationFrame(rafId);
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", onResize);
    };
  }, []);

  return (
    <div className="relative full">
      {/* MOBILE */}
      <div className="block md:hidden">
        <img src={Mobile.src} alt="Mobile" className="w-full" />
        <div className="absolute inset-0 flex justify-center text-center top-1/12">
          <h1 className="text-5xl text-white drop-shadow-2xl">
            Pfadi Meilen Herrliberg
          </h1>
        </div>
      </div>
      {/* DESKTOP */}
      <div
        ref={bannerRef}
        className="relative hidden h-screen overflow-hidden bg-[#ffaf1b] md:block"
      >
        {LAYERS.map((layer, i) => (
          <img
            key={i}
            ref={(el) => {
              layerRefs.current[i] = el;
            }}
            src={layer.src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-bottom [backface-visibility:hidden] will-change-transform"
            style={{
              transform: `translate3d(0, ${layer.translateY[0]}%, 0)`,
            }}
            decoding="async"
            draggable={false}
          />
        ))}
        <div className="absolute inset-0 flex justify-center text-center top-1/3">
          <h1 className="text-9xl text-white drop-shadow-2xl">
            Pfadi Meilen Herrliberg
          </h1>
        </div>
      </div>
    </div>
  );
}

export default Parallax;

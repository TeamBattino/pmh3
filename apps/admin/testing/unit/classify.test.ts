import { describe, expect, it } from "vitest";
import {
  classifyFile,
  extensionFromMime,
  filenameExtension,
  isAnimatedGifBuffer,
} from "@/lib/files/classify";

describe("classifyFile", () => {
  it("passes through SVG", () => {
    const c = classifyFile("image/svg+xml");
    expect(c.kind).toBe("image");
    expect(c.passthroughImage).toBe(true);
    expect(c.generateThumbnails).toBe(false);
  });

  it("passes through animated GIF but thumbs static GIF", () => {
    const animated = classifyFile("image/gif", true);
    expect(animated.passthroughImage).toBe(true);
    expect(animated.generateThumbnails).toBe(false);
    const staticGif = classifyFile("image/gif", false);
    expect(staticGif.passthroughImage).toBe(false);
    expect(staticGif.generateThumbnails).toBe(true);
  });

  it("generates thumbs + blurhash for JPEG/PNG/WebP", () => {
    for (const mt of ["image/jpeg", "image/png", "image/webp", "image/avif"]) {
      const c = classifyFile(mt);
      expect(c.kind).toBe("image");
      expect(c.generateThumbnails).toBe(true);
      expect(c.computeBlurhash).toBe(true);
    }
  });

  it("classifies video", () => {
    const c = classifyFile("video/mp4");
    expect(c.kind).toBe("video");
    expect(c.generateThumbnails).toBe(false);
  });

  it("classifies documents", () => {
    const c = classifyFile("application/pdf");
    expect(c.kind).toBe("document");
  });
});

describe("isAnimatedGifBuffer", () => {
  it("detects the NETSCAPE2.0 marker", () => {
    const marker = "NETSCAPE2.0";
    const buf = new TextEncoder().encode(
      `GIF89a........${marker}........`
    ).buffer;
    expect(isAnimatedGifBuffer(buf)).toBe(true);
  });

  it("returns false for a buffer without the marker", () => {
    const buf = new TextEncoder().encode("GIF89a not animated").buffer;
    expect(isAnimatedGifBuffer(buf)).toBe(false);
  });
});

describe("extension helpers", () => {
  it("extracts filename extensions", () => {
    expect(filenameExtension("photo.JPG")).toBe("jpg");
    expect(filenameExtension("README")).toBeNull();
    expect(filenameExtension("trailing.")).toBeNull();
  });

  it("derives extensions from mime types", () => {
    expect(extensionFromMime("image/jpeg")).toBe("jpg");
    expect(extensionFromMime("application/pdf")).toBe("pdf");
    expect(extensionFromMime("application/octet-stream")).toBe("bin");
  });
});

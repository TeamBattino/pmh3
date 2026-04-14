import type {
  AlbumItem,
  AlbumResolver,
  ResolvedAlbum,
} from "@pfadipuck/puck-web/fields/file-picker-types";
import {
  getCollectionTree,
  listCollectionFilesOrdered,
} from "@/lib/db/file-system-actions";

/**
 * Admin-side album resolver used by the Puck editor metadata. Always
 * returns items unlocked — the admin already has permission to view
 * everything, so password gating does not apply to the editor preview.
 */
export const resolveAlbumDataAdmin: AlbumResolver = async (collectionId) => {
  const tree = await getCollectionTree();
  const album = tree.find(
    (c) => c.id === collectionId && c.type === "album"
  );
  if (!album) return null;

  const files = await listCollectionFilesOrdered(collectionId);

  const items: AlbumItem[] = files.map((f) => {
    const isVideo = f.kind === "video";
    // For videos, fall back to the legacy poster (not the video file) when
    // a thumb size is missing. For images, fall back to the original.
    const imageFallback = isVideo
      ? (f.signedPosterUrl ?? null)
      : (f.signedUrl ?? null);
    return {
      fileId: f.id,
      kind: isVideo ? "video" : "image",
      width: f.width,
      height: f.height,
      blurhash: f.blurhash,
      alt: f.altText,
      locked: false,
      urls: {
        sm: f.signedThumbSmUrl ?? f.signedThumbMdUrl ?? f.signedThumbLgUrl ?? imageFallback,
        md: f.signedThumbMdUrl ?? f.signedThumbLgUrl ?? imageFallback,
        lg: f.signedThumbLgUrl ?? imageFallback,
      },
      posterUrl: f.signedPosterUrl ?? null,
      videoUrl: isVideo ? (f.signedUrl ?? null) : null,
    };
  });

  return {
    collectionId,
    title: album.title,
    passwordProtected: album.passwordProtected,
    unlocked: true,
    items,
  } satisfies ResolvedAlbum;
};

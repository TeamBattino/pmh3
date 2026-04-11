import { AlbumView } from "@/components/media/AlbumView";
import { requireServerPermission } from "@/lib/security/server-guard";

export default async function Page({
  params,
}: {
  params: Promise<{ collectionId: string; albumId: string }>;
}) {
  await requireServerPermission({ all: ["asset:read"] });
  const { collectionId, albumId } = await params;
  // The CMS Uploads landing uses `_uploads` as a sentinel collectionId —
  // there's no matching album collection, so we pass null through.
  const effectiveCollectionId =
    collectionId === "_uploads" ? null : collectionId;
  return <AlbumView collectionId={effectiveCollectionId} albumId={albumId} />;
}

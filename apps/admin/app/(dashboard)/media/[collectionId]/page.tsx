import { CollectionView } from "@/components/media/CollectionView";
import { requireServerPermission } from "@/lib/security/server-guard";

export default async function Page({
  params,
}: {
  params: Promise<{ collectionId: string }>;
}) {
  await requireServerPermission({ all: ["asset:read"] });
  const { collectionId } = await params;
  return <CollectionView collectionId={collectionId} />;
}

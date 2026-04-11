"use client";

import { Inbox } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useAlbumFileCounts,
  useCollectionTree,
} from "@/lib/files/file-system-hooks";
import { CollectionCard } from "./CollectionCard";
import { NewCollectionButton } from "./NewCollectionButton";

/**
 * `/media` landing. CMS Uploads pinned at top, album collections below.
 */
export function MediaLanding() {
  const { data: collections = [], isLoading } = useCollectionTree();
  const { data: fileCounts = {} } = useAlbumFileCounts();
  const systemAlbum = collections.find((c) => c.isSystemAlbum) ?? null;
  const albumCollections = collections.filter(
    (c) => c.type === "album_collection"
  );
  const albumCountsByCollection = new Map<string, number>();
  for (const album of collections) {
    if (album.type !== "album" || !album.parentId) continue;
    const prev = albumCountsByCollection.get(album.parentId) ?? 0;
    albumCountsByCollection.set(album.parentId, prev + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Media</h1>
        <NewCollectionButton
          type="album_collection"
          parentId={null}
          label="New album collection"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <>
          {systemAlbum && (
            <Link
              href={`/media/_uploads/${systemAlbum.id}`}
              className="flex items-center gap-3 rounded-md border border-dashed border-border bg-card p-4 transition-colors hover:border-admin-primary"
            >
              <Inbox className="size-6 text-muted-foreground" aria-hidden />
              <div>
                <div className="font-medium">CMS Uploads</div>
                <div className="text-xs text-muted-foreground">
                  Quick uploads land here ({fileCounts[systemAlbum.id] ?? 0}{" "}
                  files).
                </div>
              </div>
            </Link>
          )}

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              Album collections
            </h2>
            {albumCollections.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No album collections yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {albumCollections.map((ac) => (
                  <CollectionCard
                    key={ac.id}
                    collection={ac}
                    albumCount={albumCountsByCollection.get(ac.id) ?? 0}
                    href={`/media/${ac.id}`}
                  />
                ))}
              </div>
            )}
          </section>

        </>
      )}
    </div>
  );
}

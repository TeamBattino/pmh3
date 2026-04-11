"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCollectionTree } from "@/lib/files/file-system-hooks";
import { AlbumCard } from "./AlbumCard";
import { NewCollectionButton } from "./NewCollectionButton";

/**
 * `/media/[collectionId]` — list albums inside a single album collection.
 */
export function CollectionView({ collectionId }: { collectionId: string }) {
  const { data: collections = [], isLoading } = useCollectionTree();
  const collection = collections.find((c) => c.id === collectionId);
  const albums = collections.filter(
    (c) => c.type === "album" && c.parentId === collectionId
  );

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!collection) {
    return (
      <div className="text-sm text-muted-foreground">
        Album collection not found.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex items-center gap-1 text-sm">
        <Link
          href="/media"
          className="text-muted-foreground hover:text-foreground"
        >
          Media
        </Link>
        <ChevronRight className="size-3 text-muted-foreground" aria-hidden />
        <span className="font-medium">{collection.title}</span>
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{collection.title}</h1>
          <div className="text-xs text-muted-foreground">
            {albums.length} album{albums.length === 1 ? "" : "s"}
          </div>
        </div>
        <NewCollectionButton
          type="album"
          parentId={collectionId}
          label="New album"
        />
      </div>

      {albums.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No albums yet. Create one to start uploading.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {albums.map((album) => (
            <AlbumCard
              key={album.id}
              album={album}
              fileCount={0}
              href={`/media/${collectionId}/${album.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

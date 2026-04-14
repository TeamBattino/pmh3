import type { ComponentConfig, CustomField } from "@puckeditor/core";
import type {
  AlbumResolver,
  ResolvedAlbum,
} from "../fields/file-picker-types";
import { albumField, type AlbumFieldValue } from "../fields/album-field";
import { GalleryClient } from "./GalleryClient";

export type GalleryLayout = "grid" | "carousel";

export type GalleryProps = {
  album?: AlbumFieldValue;
  layout?: GalleryLayout;
  /** Maximum number of items to render. 0 / undefined = no limit. */
  limit?: number;
  /** Populated by `resolveData` from `metadata.resolveAlbumData`. */
  _resolvedAlbum?: ResolvedAlbum | null;
};

function Gallery({
  layout = "grid",
  limit,
  _resolvedAlbum,
}: GalleryProps) {
  if (!_resolvedAlbum) {
    return (
      <div className="w-full content-main">
        <div className="rounded-xl bg-elevated p-6 text-center text-contrast-ground/60">
          No album selected.
        </div>
      </div>
    );
  }
  const items =
    limit && limit > 0
      ? _resolvedAlbum.items.slice(0, limit)
      : _resolvedAlbum.items;

  if (items.length === 0) {
    return (
      <div className="w-full content-main">
        <div className="flex flex-col items-center gap-1 rounded-xl bg-elevated p-8 text-center text-contrast-ground/60">
          <div className="text-sm font-medium">{_resolvedAlbum.title}</div>
          <div className="text-sm">This album is empty.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full content-main">
      <GalleryClient
        album={{
          ..._resolvedAlbum,
          items,
        }}
        layout={layout}
      />
    </div>
  );
}

export const galleryConfig: ComponentConfig<GalleryProps> = {
  label: "Gallery",
  render: Gallery,
  fields: {
    album: albumField() as CustomField<AlbumFieldValue>,
    layout: {
      type: "radio",
      label: "Layout",
      options: [
        { label: "Grid", value: "grid" },
        { label: "Carousel", value: "carousel" },
      ],
    },
    limit: {
      type: "number",
      label: "Max items (0 for all)",
      min: 0,
    },
  },
  defaultProps: {
    layout: "grid",
    limit: 0,
  },
  resolveData: async (data, { metadata }) => {
    const resolveAlbumData = (
      metadata as { resolveAlbumData?: AlbumResolver }
    )?.resolveAlbumData;
    const album = data.props.album;
    let resolved: ResolvedAlbum | null = null;
    if (album?.collectionId && resolveAlbumData) {
      resolved = await resolveAlbumData(album.collectionId);
    }
    return {
      ...data,
      props: { ...data.props, _resolvedAlbum: resolved },
    };
  },
};

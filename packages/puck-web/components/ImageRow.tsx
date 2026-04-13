import { ComponentConfig, CustomField } from "@puckeditor/core";
import { mediaField } from "../fields/media-field";
import { urlField } from "../fields/url-field";
import type {
  FileUrlResolver,
  MediaRef,
} from "../fields/file-picker-types";
type ImageRowItem = {
  image?: MediaRef;
  /** Populated by `resolveData` from the caller-supplied `metadata.resolveFileUrl`. Not user-editable. */
  _resolvedImageUrl?: string;
  link: string;
};

export type ImageRowProps = {
  images: ImageRowItem[];
};

function ImageRow({ images }: ImageRowProps) {
  return (
    <div className="popout grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 py-8">
      {images.map((item, idx) => {
        const img = item._resolvedImageUrl ? (
          <div className="w-full aspect-square rounded-xl overflow-hidden bg-elevated">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item._resolvedImageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full aspect-square rounded-xl bg-elevated flex items-center justify-center text-contrast-ground/50">
            No image
          </div>
        );

        if (item.link) {
          return (
            <a key={idx} href={item.link} className="transition-transform hover:scale-105">
              {img}
            </a>
          );
        }

        return <div key={idx}>{img}</div>;
      })}
    </div>
  );
}

export const imageRowConfig: ComponentConfig<ImageRowProps> = {
  label: "Image Row",
  render: ImageRow,
  fields: {
    images: {
      type: "array",
      label: "Images",
      arrayFields: {
        image: mediaField({
          mode: "single",
          accept: ["image"],
        }) as CustomField<MediaRef | undefined>,
        link: urlField({ label: "Link (optional)" }) as CustomField<string>,
      },
      getItemSummary: (_, idx = 0) => `Image ${idx + 1}`,
      defaultItemProps: {
        link: "",
      },
    },
  },
  defaultProps: {
    images: [{ link: "" }, { link: "" }, { link: "" }],
  },
  resolveData: async (data, { metadata }) => {
    const resolveFileUrl = (metadata as { resolveFileUrl?: FileUrlResolver })
      ?.resolveFileUrl;
    const images = await Promise.all(
      (data.props.images ?? []).map(async (item) => {
        const ref = item.image;
        let resolved: string | undefined;
        if (ref && ref.type === "file" && resolveFileUrl) {
          resolved = (await resolveFileUrl(ref.fileId, "md")) ?? undefined;
        }
        return { ...item, _resolvedImageUrl: resolved };
      })
    );
    return {
      ...data,
      props: { ...data.props, images },
    };
  },
};

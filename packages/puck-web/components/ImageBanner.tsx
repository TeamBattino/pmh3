import { ComponentConfig, CustomField } from "@puckeditor/core";
import { mediaField } from "../fields/media-field";
import type {
  FileUrlResolver,
  MediaRef,
} from "../fields/file-picker-types";
export type ImageBannerProps = {
  image?: MediaRef;
  /** Populated by `resolveData` from the caller-supplied `metadata.resolveFileUrl`. Not user-editable. */
  _resolvedImageUrl?: string;
};

function ImageBanner({ _resolvedImageUrl: image }: ImageBannerProps) {
  if (!image) {
    return (
      <div className="full w-full h-64 bg-elevated flex items-center justify-center text-contrast-ground/50">
        No image selected
      </div>
    );
  }

  return (
    <div className="full w-full h-80 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="" className="w-full h-full object-cover" />
    </div>
  );
}

export const imageBannerConfig: ComponentConfig<ImageBannerProps> = {
  label: "Image Banner",
  render: ImageBanner,
  fields: {
    image: mediaField({
      mode: "single",
      accept: ["image"],
    }) as CustomField<MediaRef | undefined>,
  },
  resolveData: async (data, { metadata }) => {
    const resolveFileUrl = (metadata as { resolveFileUrl?: FileUrlResolver })
      ?.resolveFileUrl;
    const ref = data.props.image;
    let resolved: string | undefined;
    if (ref && ref.type === "file" && resolveFileUrl) {
      resolved = (await resolveFileUrl(ref.fileId, "lg")) ?? undefined;
    }
    return {
      ...data,
      props: { ...data.props, _resolvedImageUrl: resolved },
    };
  },
};

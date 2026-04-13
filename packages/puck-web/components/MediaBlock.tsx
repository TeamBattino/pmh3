import { ComponentConfig, CustomField } from "@puckeditor/core";
import { mediaField } from "../fields/media-field";
import type {
  FileUrlResolver,
  MediaRef,
} from "../fields/file-picker-types";
export type MediaBlockProps = {
  media?: MediaRef;
  /** Populated by `resolveData` from the caller-supplied `metadata.resolveFileUrl`. Not user-editable. */
  _resolvedMediaUrl?: string;
};

function MediaBlock({ _resolvedMediaUrl: media }: MediaBlockProps) {
  if (!media) {
    return (
      <div className="w-full aspect-video rounded-xl bg-elevated flex items-center justify-center text-contrast-ground/50">
        No media selected
      </div>
    );
  }

  return (
    <div className="w-full aspect-video rounded-xl overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={media} alt="" className="w-full h-full object-cover" />
    </div>
  );
}

export const mediaBlockConfig: ComponentConfig<MediaBlockProps> = {
  label: "Media Block",
  render: MediaBlock,
  fields: {
    media: mediaField({
      mode: "single",
      accept: ["image"],
    }) as CustomField<MediaRef | undefined>,
  },
  resolveData: async (data, { metadata }) => {
    const resolveFileUrl = (metadata as { resolveFileUrl?: FileUrlResolver })
      ?.resolveFileUrl;
    const ref = data.props.media;
    let resolved: string | undefined;
    if (ref && ref.type === "file" && resolveFileUrl) {
      resolved = (await resolveFileUrl(ref.fileId, "lg")) ?? undefined;
    }
    return {
      ...data,
      props: { ...data.props, _resolvedMediaUrl: resolved },
    };
  },
};

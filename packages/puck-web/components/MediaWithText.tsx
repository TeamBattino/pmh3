import { ComponentConfig, CustomField } from "@puckeditor/core";
import type { RichText } from "@puckeditor/core";
import { mediaField } from "../fields/media-field";
import type {
  FileUrlResolver,
  MediaRef,
} from "../fields/file-picker-types";
export type MediaWithTextProps = {
  image?: MediaRef;
  /** Populated by `resolveData` from the caller-supplied `metadata.resolveFileUrl`. Not user-editable. */
  _resolvedImageUrl?: string;
  heading: string;
  body: RichText;
  mediaPosition: "left" | "right";
};

function MediaWithText({
  _resolvedImageUrl: image,
  heading,
  body,
  mediaPosition,
}: MediaWithTextProps) {
  const imageBlock = (
    <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-elevated">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-contrast-ground/50">
          No image selected
        </div>
      )}
    </div>
  );

  const textBlock = (
    <div className="flex flex-col justify-center py-4">
      {heading && <h2 className="mb-4">{heading}</h2>}
      {body && <div className="text-contrast-ground/80 text-lg">{body}</div>}
    </div>
  );

  return (
    <div className="popout grid grid-cols-1 md:grid-cols-2 gap-8 py-8 items-center">
      {mediaPosition === "left" ? (
        <>
          {imageBlock}
          {textBlock}
        </>
      ) : (
        <>
          {textBlock}
          {imageBlock}
        </>
      )}
    </div>
  );
}

export const mediaWithTextConfig: ComponentConfig<MediaWithTextProps> = {
  label: "Media With Text",
  render: MediaWithText,
  fields: {
    image: mediaField({
      mode: "single",
      accept: ["image"],
    }) as CustomField<MediaRef | undefined>,
    heading: { type: "text", label: "Heading" },
    body: { type: "richtext", label: "Body" },
    mediaPosition: {
      type: "radio",
      label: "Image Position",
      options: [
        { label: "Left", value: "left" },
        { label: "Right", value: "right" },
      ],
    },
  },
  defaultProps: {
    heading: "Heading",
    body: "Write your content here...",
    mediaPosition: "left",
  },
  resolveData: async (data, { metadata }) => {
    const resolveFileUrl = (metadata as { resolveFileUrl?: FileUrlResolver })
      ?.resolveFileUrl;
    const ref = data.props.image;
    let resolved: string | undefined;
    if (ref && ref.type === "file" && resolveFileUrl) {
      resolved = (await resolveFileUrl(ref.fileId, "md")) ?? undefined;
    }
    return {
      ...data,
      props: { ...data.props, _resolvedImageUrl: resolved },
    };
  },
};

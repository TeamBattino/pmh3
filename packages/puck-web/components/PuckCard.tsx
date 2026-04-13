import { ComponentConfig, CustomField } from "@puckeditor/core";
import { mediaField } from "../fields/media-field";
import type {
  FileUrlResolver,
  MediaRef,
} from "../fields/file-picker-types";
export type PuckCardProps = {
  image?: MediaRef;
  /** Populated by `resolveData` from the caller-supplied `metadata.resolveFileUrl`. Not user-editable. */
  _resolvedImageUrl?: string;
  title: string;
  body: string;
  link: string;
};

function PuckCard({
  _resolvedImageUrl: image,
  title,
  body,
  link,
}: PuckCardProps) {
  const content = (
    <div className="rounded-xl bg-elevated overflow-hidden transition-transform hover:scale-[1.02]">
      {image && (
        <div className="w-full aspect-[16/10] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-5">
        {title && (
          <h3 className="text-xl mb-2">{title}</h3>
        )}
        {body && (
          <p className="text-contrast-ground/80">{body}</p>
        )}
      </div>
    </div>
  );

  if (link) {
    return <a href={link}>{content}</a>;
  }

  return content;
}

export const puckCardConfig: ComponentConfig<PuckCardProps> = {
  label: "Card",
  render: PuckCard,
  fields: {
    image: mediaField({
      mode: "single",
      accept: ["image"],
    }) as CustomField<MediaRef | undefined>,
    title: { type: "text", label: "Title" },
    body: { type: "textarea", label: "Body" },
    link: { type: "text", label: "Link URL (optional)" },
  },
  defaultProps: {
    title: "Card Title",
    body: "Card description...",
    link: "",
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

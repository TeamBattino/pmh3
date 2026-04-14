import { PostHeroSvg } from "@pfadipuck/graphics/PostHeroSvg";
import { mediaField } from "../fields/media-field";
import type { FileUrlResolver, MediaRef } from "../fields/file-picker-types";
import { ComponentConfig, CustomField } from "@puckeditor/core";

export type HeroProps = {
  title: string;
  backgroundImage?: MediaRef;
  /** Populated by `resolveData` from the caller-supplied `metadata.resolveFileUrl`. Not user-editable. */
  _resolvedBackgroundUrl?: string;
};

function Hero({ title, _resolvedBackgroundUrl: url }: HeroProps) {
  return (
    <div className="full w-full h-96 relative flex flex-col justify-center overflow-hidden items-center">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Hero Image"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {title && (
        <>
          <h1 className="text-4xl font-bold text-center z-10 text-white">
            {title}
          </h1>
          <div className="bg-black opacity-15 absolute w-full h-full" />
        </>
      )}
      <PostHeroSvg className="absolute bottom-0" />
    </div>
  );
}

export const heroConfig: ComponentConfig<HeroProps> = {
  render: Hero,
  fields: {
    title: {
      type: "text",
      label: "Title",
    },
    backgroundImage: mediaField({
      mode: "single",
      accept: ["image"],
    }) as CustomField<MediaRef | undefined>,
  },
  defaultProps: {
    title: "Willkommen",
  },
  resolveData: async (data, { metadata }) => {
    const resolveFileUrl = (metadata as { resolveFileUrl?: FileUrlResolver })
      ?.resolveFileUrl;
    const ref = data.props.backgroundImage;
    let resolved: string | undefined;
    if (ref && ref.type === "file" && resolveFileUrl) {
      // Hero renders a full-bleed 384px-tall banner — lg (1600px) keeps the
      // image sharp on wide displays without pulling the full original.
      resolved = (await resolveFileUrl(ref.fileId, "lg")) ?? undefined;
    }
    return {
      ...data,
      props: { ...data.props, _resolvedBackgroundUrl: resolved },
    };
  },
};

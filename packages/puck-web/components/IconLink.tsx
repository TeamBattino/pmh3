import { ComponentConfig, CustomField } from "@puckeditor/core";
import { mediaField } from "../fields/media-field";
import { urlField } from "../fields/url-field";
import type {
  FileUrlResolver,
  MediaRef,
} from "../fields/file-picker-types";
export type IconLinkProps = {
  icon?: MediaRef;
  /** Populated by `resolveData` from the caller-supplied `metadata.resolveFileUrl`. Not user-editable. */
  _resolvedIconUrl?: string;
  label: string;
  link: string;
};

function IconLink({
  _resolvedIconUrl: icon,
  label,
  link,
}: IconLinkProps) {
  return (
    <a
      href={link || "#"}
      className="flex flex-col items-center gap-2 p-4 rounded-xl transition-transform hover:scale-105"
    >
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} alt="" className="w-12 h-12 object-contain" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-elevated" />
      )}
      <span className="font-semibold text-sm text-contrast-ground text-center">
        {label}
      </span>
    </a>
  );
}

export const iconLinkConfig: ComponentConfig<IconLinkProps> = {
  label: "Icon Link",
  render: IconLink,
  fields: {
    icon: mediaField({
      mode: "single",
      accept: ["image"],
    }) as CustomField<MediaRef | undefined>,
    label: { type: "text", label: "Label" },
    link: urlField({ label: "Link" }) as CustomField<string>,
  },
  defaultProps: {
    label: "Link",
    link: "",
  },
  resolveData: async (data, { metadata }) => {
    const resolveFileUrl = (metadata as { resolveFileUrl?: FileUrlResolver })
      ?.resolveFileUrl;
    const ref = data.props.icon;
    let resolved: string | undefined;
    if (ref && ref.type === "file" && resolveFileUrl) {
      resolved = (await resolveFileUrl(ref.fileId, "sm")) ?? undefined;
    }
    return {
      ...data,
      props: { ...data.props, _resolvedIconUrl: resolved },
    };
  },
};

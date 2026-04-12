import { ComponentConfig } from "@puckeditor/core";
import { uploadFileField } from "../fields/upload-file";
import Image from "next/image";

export type IconLinkProps = {
  icon?: string;
  label: string;
  link: string;
};

function IconLink({ icon, label, link }: IconLinkProps) {
  return (
    <a
      href={link || "#"}
      className="flex flex-col items-center gap-2 p-4 rounded-xl transition-transform hover:scale-105"
    >
      {icon ? (
        <div className="relative w-12 h-12">
          <Image src={icon} alt="" fill className="object-contain" />
        </div>
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
    icon: uploadFileField,
    label: { type: "text", label: "Label" },
    link: { type: "text", label: "Link URL" },
  },
  defaultProps: {
    label: "Link",
    link: "",
  },
};

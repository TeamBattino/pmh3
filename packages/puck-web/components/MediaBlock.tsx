import { ComponentConfig } from "@puckeditor/core";
import { uploadFileField } from "../fields/upload-file";
import Image from "next/image";

export type MediaBlockProps = {
  media?: string;
};

function MediaBlock({ media }: MediaBlockProps) {
  if (!media) {
    return (
      <div className="w-full aspect-video rounded-xl bg-elevated flex items-center justify-center text-contrast-ground/50">
        No media selected
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden">
      <Image src={media} alt="" fill className="object-cover" />
    </div>
  );
}

export const mediaBlockConfig: ComponentConfig<MediaBlockProps> = {
  label: "Media Block",
  render: MediaBlock,
  fields: {
    media: uploadFileField,
  },
};

import { ComponentConfig } from "@puckeditor/core";
import { uploadFileField } from "../fields/upload-file";
import Image from "next/image";

export type ImageBannerProps = {
  image?: string;
};

function ImageBanner({ image }: ImageBannerProps) {
  if (!image) {
    return (
      <div className="full w-full h-64 bg-elevated flex items-center justify-center text-contrast-ground/50">
        No image selected
      </div>
    );
  }

  return (
    <div className="full w-full h-80 relative overflow-hidden">
      <Image src={image} alt="" fill className="object-cover" />
    </div>
  );
}

export const imageBannerConfig: ComponentConfig<ImageBannerProps> = {
  label: "Image Banner",
  render: ImageBanner,
  fields: {
    image: uploadFileField,
  },
};

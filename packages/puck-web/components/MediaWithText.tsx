import { ComponentConfig } from "@puckeditor/core";
import type { RichText } from "@puckeditor/core";
import { uploadFileField } from "../fields/upload-file";
import Image from "next/image";

export type MediaWithTextProps = {
  image?: string;
  heading: string;
  body: RichText;
  mediaPosition: "left" | "right";
};

function MediaWithText({
  image,
  heading,
  body,
  mediaPosition,
}: MediaWithTextProps) {
  const imageBlock = (
    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-elevated">
      {image ? (
        <Image src={image} alt="" fill className="object-cover" />
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
    image: uploadFileField,
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
};

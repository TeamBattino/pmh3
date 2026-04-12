import { ComponentConfig } from "@puckeditor/core";
import { uploadFileField } from "../fields/upload-file";
import Image from "next/image";

export type PuckCardProps = {
  image?: string;
  title: string;
  body: string;
  link: string;
};

function PuckCard({ image, title, body, link }: PuckCardProps) {
  const content = (
    <div className="rounded-xl bg-elevated overflow-hidden transition-transform hover:scale-[1.02]">
      {image && (
        <div className="relative w-full aspect-[16/10]">
          <Image src={image} alt="" fill className="object-cover" />
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
    image: uploadFileField,
    title: { type: "text", label: "Title" },
    body: { type: "textarea", label: "Body" },
    link: { type: "text", label: "Link URL (optional)" },
  },
  defaultProps: {
    title: "Card Title",
    body: "Card description...",
    link: "",
  },
};

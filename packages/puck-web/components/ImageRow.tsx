import { ComponentConfig } from "@puckeditor/core";
import { uploadFileField } from "../fields/upload-file";
import Image from "next/image";

export type ImageRowProps = {
  images: {
    image?: string;
    link: string;
  }[];
};

function ImageRow({ images }: ImageRowProps) {
  return (
    <div className="popout grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 py-8">
      {images.map((item, idx) => {
        const img = item.image ? (
          <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-elevated">
            <Image src={item.image} alt="" fill className="object-cover" />
          </div>
        ) : (
          <div className="w-full aspect-square rounded-xl bg-elevated flex items-center justify-center text-contrast-ground/50">
            No image
          </div>
        );

        if (item.link) {
          return (
            <a key={idx} href={item.link} className="transition-transform hover:scale-105">
              {img}
            </a>
          );
        }

        return <div key={idx}>{img}</div>;
      })}
    </div>
  );
}

export const imageRowConfig: ComponentConfig<ImageRowProps> = {
  label: "Image Row",
  render: ImageRow,
  fields: {
    images: {
      type: "array",
      label: "Images",
      arrayFields: {
        image: uploadFileField,
        link: { type: "text", label: "Link URL (optional)" },
      },
      getItemSummary: (_, idx = 0) => `Image ${idx + 1}`,
      defaultItemProps: {
        link: "",
      },
    },
  },
  defaultProps: {
    images: [{ link: "" }, { link: "" }, { link: "" }],
  },
};

import { ComponentConfig } from "@puckeditor/core";
import { uploadFileField } from "../fields/upload-file";
import Image from "next/image";

export type CardRowProps = {
  cards: {
    icon?: string;
    title: string;
    link: string;
  }[];
};

function CardRow({ cards }: CardRowProps) {
  return (
    <div className="popout grid grid-cols-2 md:grid-cols-4 gap-4 py-8">
      {cards.map((card, idx) => (
        <a
          key={idx}
          href={card.link || "#"}
          className="flex flex-col items-center gap-3 rounded-xl bg-elevated p-6 text-center transition-transform hover:scale-105"
        >
          {card.icon && (
            <div className="relative w-16 h-16">
              <Image src={card.icon} alt="" fill className="object-contain" />
            </div>
          )}
          <span className="font-semibold text-contrast-ground">
            {card.title}
          </span>
        </a>
      ))}
    </div>
  );
}

export const cardRowConfig: ComponentConfig<CardRowProps> = {
  label: "Card Row",
  render: CardRow,
  fields: {
    cards: {
      type: "array",
      label: "Cards",
      arrayFields: {
        icon: uploadFileField,
        title: { type: "text", label: "Title" },
        link: { type: "text", label: "Link URL" },
      },
      getItemSummary: (item) => item.title || "Untitled",
      defaultItemProps: {
        title: "Card",
        link: "",
      },
    },
  },
  defaultProps: {
    cards: [
      { title: "Card 1", link: "" },
      { title: "Card 2", link: "" },
      { title: "Card 3", link: "" },
      { title: "Card 4", link: "" },
    ],
  },
};

import { ComponentConfig, CustomField } from "@puckeditor/core";
import { mediaField } from "../fields/media-field";
import type {
  FileUrlResolver,
  MediaRef,
} from "../fields/file-picker-types";
type CardRowCard = {
  icon?: MediaRef;
  /** Populated by `resolveData` from the caller-supplied `metadata.resolveFileUrl`. Not user-editable. */
  _resolvedIconUrl?: string;
  title: string;
  link: string;
};

export type CardRowProps = {
  cards: CardRowCard[];
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
          {card._resolvedIconUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={card._resolvedIconUrl}
              alt=""
              className="w-16 h-16 object-contain"
            />
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
        icon: mediaField({
          mode: "single",
          accept: ["image"],
        }) as CustomField<MediaRef | undefined>,
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
  resolveData: async (data, { metadata }) => {
    const resolveFileUrl = (metadata as { resolveFileUrl?: FileUrlResolver })
      ?.resolveFileUrl;
    const cards = await Promise.all(
      (data.props.cards ?? []).map(async (card) => {
        const ref = card.icon;
        let resolved: string | undefined;
        if (ref && ref.type === "file" && resolveFileUrl) {
          resolved = (await resolveFileUrl(ref.fileId, "sm")) ?? undefined;
        }
        return { ...card, _resolvedIconUrl: resolved };
      })
    );
    return {
      ...data,
      props: { ...data.props, cards },
    };
  },
};

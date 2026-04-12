import { ComponentConfig, WithPuckProps } from "@puckeditor/core";

export type CardGridProps = {};

const ALLOWED_COMPONENTS = [
  "TextBlock",
  "MediaBlock",
  "Card",
  "ButtonGroup",
  "IconLink",
];

function CardGrid({ puck: { renderDropZone } }: WithPuckProps<CardGridProps>) {
  const DropZone = renderDropZone;
  return (
    <div className="popout py-8">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
        <DropZone zone="cards" allow={ALLOWED_COMPONENTS} />
      </div>
    </div>
  );
}

export const cardGridConfig: ComponentConfig<CardGridProps> = {
  label: "Card Grid",
  render: CardGrid,
};

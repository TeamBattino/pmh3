import { ComponentConfig, WithPuckProps } from "@puckeditor/core";

const LAYOUT_OPTIONS = {
  "1:1": [1, 1],
  "2:1": [2, 1],
  "1:2": [1, 2],
  "1:1:1": [1, 1, 1],
} as const;

type LayoutKey = keyof typeof LAYOUT_OPTIONS;

export type ColumnsProps = {
  layout: LayoutKey;
};

const ALLOWED_COMPONENTS = [
  "TextBlock",
  "MediaBlock",
  "Card",
  "ButtonGroup",
  "IconLink",
];

function Columns({
  layout,
  puck: { renderDropZone },
}: WithPuckProps<ColumnsProps>) {
  const DropZone = renderDropZone;
  const ratios = LAYOUT_OPTIONS[layout] ?? LAYOUT_OPTIONS["1:1"];

  const gridCols = ratios.map((r) => `${r}fr`).join(" ");

  return (
    <div
      className="popout py-8 grid gap-6"
      style={{
        gridTemplateColumns: gridCols,
      }}
    >
      {ratios.map((_, idx) => (
        <div key={idx} className="min-h-[80px]">
          <DropZone zone={`column-${idx}`} allow={ALLOWED_COMPONENTS} />
        </div>
      ))}
    </div>
  );
}

export const columnsConfig: ComponentConfig<ColumnsProps> = {
  label: "Columns",
  render: Columns,
  fields: {
    layout: {
      type: "radio",
      label: "Layout",
      options: [
        { label: "1:1", value: "1:1" },
        { label: "2:1", value: "2:1" },
        { label: "1:2", value: "1:2" },
        { label: "1:1:1", value: "1:1:1" },
      ],
    },
  },
  defaultProps: {
    layout: "1:1",
  },
};

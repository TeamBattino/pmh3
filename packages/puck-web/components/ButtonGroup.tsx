import { ComponentConfig } from "@puckeditor/core";

export type ButtonGroupProps = {
  buttons: {
    label: string;
    link: string;
    variant: "primary" | "outline";
  }[];
};

function ButtonGroup({ buttons }: ButtonGroupProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {buttons.map((btn, idx) => (
        <a
          key={idx}
          href={btn.link || "#"}
          className={
            btn.variant === "primary"
              ? "inline-block bg-primary text-contrast-primary font-semibold px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors"
              : "inline-block border-2 border-primary text-primary font-semibold px-6 py-2.5 rounded-lg hover:bg-primary/10 transition-colors"
          }
        >
          {btn.label}
        </a>
      ))}
    </div>
  );
}

export const buttonGroupConfig: ComponentConfig<ButtonGroupProps> = {
  label: "Button Group",
  render: ButtonGroup,
  fields: {
    buttons: {
      type: "array",
      label: "Buttons",
      arrayFields: {
        label: { type: "text", label: "Label" },
        link: { type: "text", label: "Link URL" },
        variant: {
          type: "radio",
          label: "Style",
          options: [
            { label: "Primary", value: "primary" },
            { label: "Outline", value: "outline" },
          ],
        },
      },
      getItemSummary: (item) => item.label || "Untitled",
      defaultItemProps: {
        label: "Button",
        link: "",
        variant: "primary",
      },
    },
  },
  defaultProps: {
    buttons: [{ label: "Button", link: "", variant: "primary" }],
  },
};

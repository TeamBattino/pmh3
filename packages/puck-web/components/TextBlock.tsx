import { ComponentConfig } from "@puckeditor/core";
import type { RichText } from "@puckeditor/core";

export type TextBlockProps = {
  heading: string;
  body: RichText;
};

function TextBlock({ heading, body }: TextBlockProps) {
  return (
    <div>
      {heading && <h3 className="mb-2">{heading}</h3>}
      {body && <div className="text-contrast-ground/80">{body}</div>}
    </div>
  );
}

export const textBlockConfig: ComponentConfig<TextBlockProps> = {
  label: "Text Block",
  render: TextBlock,
  fields: {
    heading: { type: "text", label: "Heading" },
    body: { type: "richtext", label: "Body" },
  },
  defaultProps: {
    heading: "Heading",
    body: "Write your content here...",
  },
};

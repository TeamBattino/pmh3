import { ComponentConfig } from "@puckeditor/core";
import type { RichText } from "@puckeditor/core";

export type TextSectionProps = {
  heading: string;
  body: RichText;
};

function TextSection({ heading, body }: TextSectionProps) {
  return (
    <div className="py-8">
      {heading && <h2 className="mb-4">{heading}</h2>}
      {body && <div className="text-contrast-ground/80 text-lg">{body}</div>}
    </div>
  );
}

export const textSectionConfig: ComponentConfig<TextSectionProps> = {
  label: "Text Section",
  render: TextSection,
  fields: {
    heading: { type: "text", label: "Heading" },
    body: { type: "richtext", label: "Body" },
  },
  defaultProps: {
    heading: "Heading",
    body: "Write your content here...",
  },
};

import { urlField } from "../fields/url-field";
import { ComponentConfig, CustomField } from "@puckeditor/core";

export type CallToActionProps = {
  heading: string;
  body: string;
  buttonText: string;
  buttonLink: string;
};

function CallToAction({
  heading,
  body,
  buttonText,
  buttonLink,
}: CallToActionProps) {
  return (
    <div className="popout rounded-xl bg-elevated py-12 px-8 text-center">
      {heading && <h2 className="mb-3">{heading}</h2>}
      {body && (
        <p className="text-contrast-ground/80 text-lg mb-6 max-w-prose mx-auto">
          {body}
        </p>
      )}
      {buttonText && (
        <a
          href={buttonLink || "#"}
          className="inline-block bg-primary text-contrast-primary font-semibold px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors"
        >
          {buttonText}
        </a>
      )}
    </div>
  );
}

export const callToActionConfig: ComponentConfig<CallToActionProps> = {
  label: "Call To Action",
  render: CallToAction,
  fields: {
    heading: { type: "text", label: "Heading" },
    body: { type: "textarea", label: "Body" },
    buttonText: { type: "text", label: "Button Text" },
    buttonLink: urlField({ label: "Button Link" }) as CustomField<string>,
  },
  defaultProps: {
    heading: "Ready to join?",
    body: "Come visit us and see what scouting is all about.",
    buttonText: "Learn More",
    buttonLink: "",
  },
};

import { ComponentConfig } from "@puckeditor/core";
import { FAQItem } from "./FAQItem";

export type FAQProps = {
  heading: string;
  items: {
    question: string;
    answer: string;
  }[];
};

function FAQ({ heading, items }: FAQProps) {
  return (
    <div className="py-8">
      {heading && <h2 className="mb-6">{heading}</h2>}
      <div>
        {items.map((item, idx) => (
          <FAQItem key={idx} question={item.question} answer={item.answer} />
        ))}
      </div>
    </div>
  );
}

export const faqConfig: ComponentConfig<FAQProps> = {
  label: "FAQ",
  render: FAQ,
  fields: {
    heading: { type: "text", label: "Heading" },
    items: {
      type: "array",
      label: "Questions",
      arrayFields: {
        question: { type: "text", label: "Question" },
        answer: { type: "textarea", label: "Answer" },
      },
      getItemSummary: (item) => item.question || "Untitled",
      defaultItemProps: {
        question: "Question?",
        answer: "Answer...",
      },
    },
  },
  defaultProps: {
    heading: "Frequently Asked Questions",
    items: [
      { question: "What is this?", answer: "A great question!" },
      { question: "How does it work?", answer: "Like magic." },
    ],
  },
};

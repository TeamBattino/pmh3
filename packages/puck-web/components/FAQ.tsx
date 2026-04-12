"use client";

import { ComponentConfig } from "@puckeditor/core";
import { useState } from "react";

export type FAQProps = {
  heading: string;
  items: {
    question: string;
    answer: string;
  }[];
};

function FAQItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-contrast-ground/20">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left cursor-pointer"
      >
        <span className="font-semibold text-lg">{question}</span>
        <span className="text-2xl ml-4">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="pb-4 text-contrast-ground/80">{answer}</div>
      )}
    </div>
  );
}

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

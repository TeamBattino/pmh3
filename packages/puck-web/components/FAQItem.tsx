"use client";

import { useState } from "react";

export function FAQItem({
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

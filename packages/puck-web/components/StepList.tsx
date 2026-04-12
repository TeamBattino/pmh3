import { ComponentConfig } from "@puckeditor/core";

export type StepListProps = {
  heading: string;
  steps: {
    title: string;
    description: string;
  }[];
};

function StepList({ heading, steps }: StepListProps) {
  return (
    <div className="py-8">
      {heading && <h2 className="mb-6">{heading}</h2>}
      <ol className="flex flex-col gap-6">
        {steps.map((step, idx) => (
          <li key={idx} className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-contrast-primary flex items-center justify-center font-bold text-lg">
              {idx + 1}
            </div>
            <div>
              <h3 className="text-xl mb-1">{step.title}</h3>
              <p className="text-contrast-ground/80">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export const stepListConfig: ComponentConfig<StepListProps> = {
  label: "Step List",
  render: StepList,
  fields: {
    heading: { type: "text", label: "Heading" },
    steps: {
      type: "array",
      label: "Steps",
      arrayFields: {
        title: { type: "text", label: "Title" },
        description: { type: "textarea", label: "Description" },
      },
      getItemSummary: (item, idx = 0) =>
        item.title || `Step ${idx + 1}`,
      defaultItemProps: {
        title: "Step",
        description: "",
      },
    },
  },
  defaultProps: {
    heading: "How it works",
    steps: [
      { title: "Step 1", description: "Description..." },
      { title: "Step 2", description: "Description..." },
      { title: "Step 3", description: "Description..." },
    ],
  },
};

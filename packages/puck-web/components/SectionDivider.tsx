import { SectionBreak } from "../ui/SectionBreak";
import { ComponentConfig } from "@puckeditor/core";

export type SectionDividerProps = {};

function SectionDivider({}: SectionDividerProps) {
  return (
    <div className="full">
      <SectionBreak />
    </div>
  );
}

export const sectionDividerConfig: ComponentConfig<SectionDividerProps> = {
  render: SectionDivider,
};

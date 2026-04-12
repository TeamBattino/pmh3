import { SectionBreak } from "../ui/SectionBreak";
import type { Theme } from "../lib/section-theming";
import { ComponentConfig } from "@puckeditor/core";

export type SectionDividerProps = {};

function SectionDivider(props: SectionDividerProps) {
  // `theme` is injected by `applySectionTheming`; it's not a declared field
  // on SectionDividerProps so we pick it off via a cast.
  const theme = (props as { theme?: Theme }).theme ?? "mud";
  return (
    <div className="full">
      <SectionBreak theme={theme} />
    </div>
  );
}

export const sectionDividerConfig: ComponentConfig<SectionDividerProps> = {
  render: SectionDivider,
};

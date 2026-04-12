import { Theme } from "../lib/section-theming";
import { PropsWithChildren } from "react";

export function SectionThemedComponent({
  children,
  theme,
}: PropsWithChildren<{ theme: Theme }>) {
  return (
    <div className={`${theme}-theme bg-ground content-main overflow-hidden`}>
      {children}
    </div>
  );
}

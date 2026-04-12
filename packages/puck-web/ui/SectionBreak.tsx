import {
  PremudBreak,
  PresunBreak,
} from "@pfadipuck/graphics/SectionBreakSvgs";
import type { Theme } from "../lib/section-theming";

export function SectionBreak({ theme }: { theme: Theme }) {
  return theme === "mud" ? <PremudBreak /> : <PresunBreak />;
}

"use client";
import {
  PremudBreak,
  PresunBreak,
} from "@pfadipuck/graphics/SectionBreakSvgs";
import { useSectionTheme } from "../lib/section-theme-context";

export function SectionBreak() {
  const theme = useSectionTheme();
  return theme === "mud" ? <PremudBreak /> : <PresunBreak />;
}

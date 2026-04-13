"use client";
import { NavbarDropdownArrowSvg } from "@pfadipuck/graphics/NavbarDropdownArrowSvg";
import { NavbarDropdownGroupedProps } from "./NavbarDropdown";
import { useState } from "react";

export function NavbarDropdownMobile({
  label,
  groupedItems,
  editMode = false,
}: NavbarDropdownGroupedProps & { editMode?: boolean }) {
  const [open, setOpen] = useState(editMode);
  const toggleOpen = () => {
    setOpen((prevOpen) => !prevOpen);
  };
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={toggleOpen}
        className="group flex w-full items-center justify-center gap-2 rounded-xl border-2 border-brand-yellow/80 bg-primary px-4 py-3 font-rockingsoda text-2xl text-contrast-primary shadow-[4px_4px_0_0_var(--color-brand-yellow)] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        aria-expanded={open}
      >
        {label}
        <NavbarDropdownArrowSvg
          invertRotationDirection={true}
          open={open}
          className="fill-contrast-primary"
        />
      </button>
      {open && (
        <div className="ml-4 flex flex-col gap-3 border-l-2 border-dashed border-brand-yellow/70 pl-4">
          {groupedItems.map((items, index) => (
            <div key={index} className="flex flex-col gap-1">
              {items[0].groups_with && (
                <div className="flex items-center gap-2 px-1">
                  <span className="h-px flex-1 bg-brand-yellow/60" />
                  <span className="font-rockingsoda text-sm uppercase tracking-widest text-brand-yellow">
                    {items[0].groups_with}
                  </span>
                  <span className="h-px flex-1 bg-brand-yellow/60" />
                </div>
              )}
              {items.map((item, idx) => (
                <a
                  key={idx}
                  href={item.url || undefined}
                  className="block rounded-md border border-brand-yellow/30 bg-transparent px-3 py-2 text-center font-rockingsoda text-xl text-contrast-ground transition-colors active:bg-primary active:text-contrast-primary"
                >
                  {item.label}
                </a>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

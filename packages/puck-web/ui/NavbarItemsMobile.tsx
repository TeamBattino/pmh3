"use client";
import { NavbarHamburgerSvg } from "@pfadipuck/graphics/NavbarHamburgerSvg";
import ClickAwayListener from "./ClickAwayListener";
import { NavbarLogo } from "./NavbarLogo";
import { ReactNode, useId, useRef, useState } from "react";

export type NavbarComponentsProps = {
  navbarItems: ReactNode;
  logoUrl?: string;
};

export function NavbarItemsMobile({
  navbarItems,
  logoUrl,
}: NavbarComponentsProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navbarOverlayId = useId();

  function handleClickAway(_type: string, event: Event) {
    if (buttonRef.current?.contains(event.target as Node)) return;
    setOpen(false);
  }
  return (
    <>
      <div className="md:hidden grid grid-cols-[1fr_min-content_1fr] border-b-[#edc600] border-b-8">
        <div></div>
        <div className="relative z-20 w-28 h-28 mb-[-50px]">
          {logoUrl && <NavbarLogo logo={logoUrl} />}
        </div>
        <div className="flex items-center justify-end">
          <button
            ref={buttonRef}
            className="text-gray-500 w-10 h-10 relative mr-5 focus:outline-none border rounded-full border-dashed"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls={navbarOverlayId}
            aria-label="Open main menu"
          >
            <NavbarHamburgerSvg open={open} />
          </button>
        </div>
      </div>
      {open && (
        <div
          id={navbarOverlayId}
          className="md:hidden absolute z-10 overflow-auto w-full h-[calc(100vh-5rem)] bg-ground/90 backdrop-blur-sm"
        >
          <div className="px-4 pt-20 pb-10">
            <ClickAwayListener onClickAway={handleClickAway}>
              <div className="flex flex-col gap-4">{navbarItems}</div>
            </ClickAwayListener>
          </div>
        </div>
      )}
    </>
  );
}

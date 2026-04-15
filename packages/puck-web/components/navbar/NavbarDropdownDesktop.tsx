"use client";
import { NavbarDropdownArrowSvg } from "@pfadipuck/graphics/NavbarDropdownArrowSvg";
import { usePathname } from "next/navigation";
import { Fragment, useState } from "react";
import ClickAwayListener from "../../ui/ClickAwayListener";
import { NavbarDropdownGroupedProps } from "./NavbarDropdown";
import { NavbarDesktopLink } from "./NavbarDesktopLink";

export function NavbarDropdownDesktop({
  label,
  groupedItems,
}: NavbarDropdownGroupedProps) {
  const [open, setOpen] = useState(false);
  const toggleOpen = () => {
    setOpen((prevOpen) => !prevOpen);
  };
  const pathname = usePathname();
  const hasActiveChild = groupedItems.some((items) =>
    items.some((item) => !!item.url && item.url === pathname)
  );
  return (
    <div className="relative">
      <button
        onClick={toggleOpen}
        className="group inline-flex flex-col items-stretch font-londrina text-2xl text-black"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-1 px-0.5">
          <span>{label}</span>
          <NavbarDropdownArrowSvg
            open={open}
            className="fill-black transition-transform duration-200"
          />
        </span>
        {hasActiveChild ? (
          <span
            aria-hidden
            className="h-[3px] w-full bg-[length:9px_3px] bg-left bg-repeat-x bg-[linear-gradient(to_right,var(--color-brand-yellow)_5px,transparent_5px)]"
          />
        ) : (
          <span
            aria-hidden
            className={
              "h-[3px] w-full origin-left bg-brand-yellow transition-transform duration-200 " +
              (open ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100")
            }
          />
        )}
      </button>
      {open && (
        <ClickAwayListener onClickAway={() => setOpen(false)}>
          <div className="absolute left-1/2 top-full z-30 mt-2 flex min-w-48 -translate-x-1/2 flex-col rounded-xl border-2 border-brand-yellow bg-white p-3 font-londrina text-xl text-black shadow-[4px_4px_0_0_var(--color-brand-yellow)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 52.36 24.43"
              className="pointer-events-none absolute left-1/2 top-0 z-20 h-7 w-12 -translate-x-1/2 -translate-y-[calc(100%-6px)] drop-shadow-[0_-1px_1.5px_rgba(0,0,0,0.15)]"
              aria-hidden
            >
              <path
                stroke="none"
                fill="white"
                d="M0,22c.18,0,15.99.01,17.77-21.53-.01-.5.67-.65.87-.2,1.72,4.02,5.6,11.55,11.83,15.62,8.27,5.38,16.59,6.13,21.89,6.13,0,.02-50.12-.02-52.36-.02Z"
              />
            </svg>
            {groupedItems.map((items, index) => (
              <Fragment key={index}>
                <div className="flex w-full items-center gap-2 py-1">
                  <div className="h-[3px] grow bg-brand-yellow" />
                  {items[0].groups_with && (
                    <>
                      <span className="whitespace-nowrap text-sm uppercase tracking-wider text-black/70">
                        {items[0].groups_with}
                      </span>
                      <div className="h-[3px] min-w-3 grow bg-brand-yellow" />
                    </>
                  )}
                </div>
                {items.map((item, idx) => (
                  <NavbarDesktopLink
                    key={idx}
                    href={item.url}
                    variant="dropdown"
                  >
                    {item.label}
                  </NavbarDesktopLink>
                ))}
              </Fragment>
            ))}
          </div>
        </ClickAwayListener>
      )}
    </div>
  );
}

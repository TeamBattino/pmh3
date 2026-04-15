"use client";

import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import type { ReactNode } from "react";

type NavbarDesktopLinkProps = {
  href?: string;
  children: ReactNode;
  /**
   * Style variant. "top" is the main navbar row (londrina 2xl with the
   * animated yellow underline). "dropdown" is an item inside the desktop
   * dropdown popover (smaller, rounded hover background).
   */
  variant?: "top" | "dropdown";
};

/**
 * Shared client leaf for desktop navbar links. Reads `usePathname()` to mark
 * the current page as active so the Puck-registered `NavbarItem` /
 * `NavbarDropdown` render functions can stay server components (per the RSC
 * rule in CLAUDE.md).
 */
export function NavbarDesktopLink({
  href,
  children,
  variant = "top",
}: NavbarDesktopLinkProps) {
  const pathname = usePathname();
  const active = !!href && pathname === href;

  if (variant === "dropdown") {
    return (
      <a
        href={href || undefined}
        className={clsx(
          "block rounded-md px-3 py-1.5 text-center transition-colors",
          active
            ? "bg-brand-yellow/25 text-black"
            : "hover:bg-brand-yellow/15 text-black"
        )}
      >
        {children}
      </a>
    );
  }

  return (
    <a
      href={href || undefined}
      className="group inline-flex flex-col items-stretch font-londrina text-2xl text-black"
    >
      <span className="px-0.5">{children}</span>
      <span
        aria-hidden
        className={clsx(
          "h-[3px] w-full origin-left bg-brand-yellow transition-transform duration-200",
          active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
        )}
      />
    </a>
  );
}

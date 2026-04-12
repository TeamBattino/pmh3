"use client";

import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/Separator";
import { SidebarTrigger } from "@/components/ui/Sidebar";

/**
 * Dashboard header bar. Shows the sidebar toggle, the app name, and the
 * label of the current top-level page so the user never has to squint
 * at the sidebar's active state to know where they are.
 *
 * The label map duplicates a little with AppSidebar's nav groups — we
 * could share a module, but the list is short enough that inlining it
 * here keeps this component fully self-contained.
 */

const ROUTES: Array<{ match: (pathname: string) => boolean; label: string }> = [
  { match: (p) => p === "/web/navbar", label: "Navbar" },
  { match: (p) => p === "/web/footer", label: "Footer" },
  { match: (p) => p.startsWith("/documents"), label: "Documents" },
  { match: (p) => p.startsWith("/media"), label: "Media" },
  { match: (p) => p.startsWith("/security"), label: "Roles" },
  // Catch-all for pages must come LAST so `/web/navbar` and `/web/footer`
  // above are reached first.
  { match: (p) => p === "/web" || p.startsWith("/web/"), label: "Pages" },
];

function labelForPathname(pathname: string): string | null {
  for (const route of ROUTES) {
    if (route.match(pathname)) return route.label;
  }
  return null;
}

export function DashboardHeader() {
  const pathname = usePathname() ?? "";
  const pageLabel = labelForPathname(pathname);

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mx-1 h-5" />
      <span className="text-sm font-semibold tracking-tight">Pfadi Admin</span>
      {pageLabel && (
        <>
          <ChevronRight
            className="size-4 text-muted-foreground"
            aria-hidden
          />
          <span className="text-sm font-medium text-foreground">
            {pageLabel}
          </span>
        </>
      )}
    </header>
  );
}

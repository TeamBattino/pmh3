"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Bridge between Puck custom fields in `packages/puck-web` (which must not
 * import admin-only code) and the list of existing page paths held by the
 * admin DB. The admin's editor layout fetches paths server-side and mounts
 * `<PagePathsProvider pagePaths={...}>` so `urlField()` can render a picker
 * of known pages alongside a "custom URL" fallback.
 *
 * The site never uses custom fields, so no provider is needed there — stored
 * URL values are plain strings and render directly.
 */

type PagePathsContextValue = {
  pagePaths: string[];
};

const PagePathsContext = createContext<PagePathsContextValue>({
  pagePaths: [],
});

export function PagePathsProvider({
  pagePaths,
  children,
}: {
  pagePaths: string[];
  children: ReactNode;
}) {
  return (
    <PagePathsContext.Provider value={{ pagePaths }}>
      {children}
    </PagePathsContext.Provider>
  );
}

export function usePagePaths(): string[] {
  return useContext(PagePathsContext).pagePaths;
}

"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import type { PageListItem } from "@/lib/db/db";
import { PageRowMenu } from "./PageRowMenu";

export type SortCol = "title" | "path" | "updatedAt";
export type SortDir = "asc" | "desc";
type SortState = { col: SortCol; dir: SortDir };

export type PageListProps = {
  pages: PageListItem[];
  isLoading: boolean;
  onDuplicate: (page: PageListItem) => void;
  onDelete: (page: PageListItem) => void;
};

export function PageList({
  pages,
  isLoading,
  onDuplicate,
  onDelete,
}: PageListProps) {
  const router = useRouter();
  const [sort, setSort] = useState<SortState>({ col: "path", dir: "asc" });

  const sorted = useMemo(() => {
    const list = [...pages];
    list.sort((a, b) => {
      let delta = 0;
      switch (sort.col) {
        case "title":
          delta = a.title.localeCompare(b.title);
          break;
        case "path":
          delta = a.path.localeCompare(b.path);
          break;
        case "updatedAt": {
          const ta = a.updatedAt ?? "";
          const tb = b.updatedAt ?? "";
          delta = ta.localeCompare(tb);
          break;
        }
      }
      return sort.dir === "desc" ? -delta : delta;
    });
    return list;
  }, [pages, sort]);

  const showHierarchy = sort.col === "path" && sort.dir === "asc";

  const toggleSort = (col: SortCol) => {
    if (sort.col === col) {
      setSort({ col, dir: sort.dir === "asc" ? "desc" : "asc" });
    } else {
      setSort({ col, dir: "asc" });
    }
  };

  const depthOf = (path: string) =>
    showHierarchy ? path.split("/").filter(Boolean).length : 0;

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        No pages yet
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div
        className={cn(
          "sticky top-0 z-10 hidden items-center border-b border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground md:grid",
          "grid-cols-[1fr_minmax(6rem,auto)_6rem_2rem] gap-3"
        )}
      >
        <SortHeader label="Title" col="title" sort={sort} onClick={toggleSort} />
        <SortHeader label="Path" col="path" sort={sort} onClick={toggleSort} />
        <SortHeader
          label="Modified"
          col="updatedAt"
          sort={sort}
          onClick={toggleSort}
          align="end"
        />
        <span aria-hidden />
      </div>

      {/* Rows */}
      <ul>
        {sorted.map((page) => {
          const depth = depthOf(page.path);
          return (
            <li
              key={page.path}
              className={cn(
                "group border-b border-border px-3 py-2 text-sm hover:bg-accent/40",
                "md:grid md:grid-cols-[1fr_minmax(6rem,auto)_6rem_2rem] md:items-center md:gap-3",
                "md:cursor-pointer"
              )}
              onClick={() => router.push(`/web/editor${page.path}`)}
            >
              {/* Desktop layout */}
              <span
                className="hidden truncate md:block"
                style={{ paddingLeft: depth * 24 }}
              >
                {page.title}
              </span>
              <span className="hidden truncate text-xs text-muted-foreground md:block">
                {page.path}
              </span>
              <span className="hidden truncate text-right text-xs text-muted-foreground md:block">
                {formatDate(page.updatedAt)}
              </span>

              {/* Mobile layout */}
              <div className="flex items-center justify-between gap-2 md:hidden">
                <span className="truncate font-medium">{page.title}</span>
                <div
                  className="shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <PageRowMenu
                    path={page.path}
                    onEdit={() => router.push(`/web/editor${page.path}`)}
                    onDuplicate={() => onDuplicate(page)}
                    onDelete={() => onDelete(page)}
                  />
                </div>
              </div>
              <div className="mt-0.5 flex items-center justify-between text-xs text-muted-foreground md:hidden">
                <span className="truncate">{page.path}</span>
                <span className="shrink-0">{formatDate(page.updatedAt)}</span>
              </div>

              {/* Desktop menu */}
              <div
                className="hidden items-center justify-end md:flex"
                onClick={(e) => e.stopPropagation()}
              >
                <PageRowMenu
                  path={page.path}
                  onEdit={() => router.push(`/web/editor${page.path}`)}
                  onDuplicate={() => onDuplicate(page)}
                  onDelete={() => onDelete(page)}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SortHeader({
  label,
  col,
  sort,
  onClick,
  align = "start",
}: {
  label: string;
  col: SortCol;
  sort: SortState;
  onClick: (col: SortCol) => void;
  align?: "start" | "end";
}) {
  const active = sort.col === col;
  return (
    <button
      type="button"
      onClick={() => onClick(col)}
      className={cn(
        "flex items-center gap-1 hover:text-foreground",
        align === "end" && "justify-end"
      )}
    >
      <span>{label}</span>
      {active &&
        (sort.dir === "asc" ? (
          <ChevronUp className="size-3" aria-hidden />
        ) : (
          <ChevronDown className="size-3" aria-hidden />
        ))}
    </button>
  );
}

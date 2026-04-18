"use client";

import { ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import {
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/Dialog";
import { ErrorLabel } from "@/components/ui/ErrorLabel";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { cn } from "@/lib/cn";
import { createPage, duplicatePage } from "@/lib/db/db-actions";
import type { PageListItem } from "@/lib/db/db";
import { queryClient } from "@/lib/query-client";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parentOf(path: string): string {
  const segments = path.split("/").filter(Boolean);
  if (segments.length <= 1) return "/";
  return "/" + segments.slice(0, -1).join("/");
}

function lastSegment(path: string): string {
  const segments = path.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "";
}

export type CreatePageModalProps = {
  pages: PageListItem[];
  sourcePath?: string | null;
  sourceTitle?: string | null;
  onCreated?: () => void;
};

export function CreatePageModal({
  pages,
  sourcePath,
  sourceTitle,
  onCreated,
}: CreatePageModalProps) {
  const router = useRouter();
  const isDuplicate = !!sourcePath;

  const [title, setTitle] = useState(
    isDuplicate ? `${sourceTitle ?? "Untitled"} (copy)` : ""
  );
  const [slug, setSlug] = useState(
    isDuplicate ? `${lastSegment(sourcePath!!)}-copy` : ""
  );
  const [slugTouched, setSlugTouched] = useState(false);
  const [parent, setParent] = useState(
    isDuplicate ? parentOf(sourcePath!!) : "/"
  );
  const [parentPickerOpen, setParentPickerOpen] = useState(false);
  const [parentFilter, setParentFilter] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const fullPath = useMemo(() => {
    if (!slug && parent === "/") return "/";
    if (parent === "/") return `/${slug}`;
    return `${parent}/${slug}`;
  }, [parent, slug]);

  const pathExists = useMemo(
    () => pages.some((p) => p.path === fullPath),
    [pages, fullPath]
  );

  const parentOptions = useMemo(() => {
    const paths = new Set<string>(["/", ...pages.map((p) => p.path)]);
    return Array.from(paths).sort((a, b) => a.localeCompare(b));
  }, [pages]);

  const filteredParents = useMemo(() => {
    if (!parentFilter) return parentOptions;
    const q = parentFilter.toLowerCase();
    return parentOptions.filter((p) => p.toLowerCase().includes(q));
  }, [parentOptions, parentFilter]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  };

  const handleSlugBlur = () => {
    setSlug(slugify(slug));
  };

  const validationError = useMemo(() => {
    if (!title.trim()) return null; // don't show error while empty
    if (pathExists) return `A page at "${fullPath}" already exists`;
    if (slug && !/^[a-z0-9-]+$/.test(slug))
      return "Slug can only contain lowercase letters, numbers, and hyphens";
    return null;
  }, [title, slug, fullPath, pathExists]);

  const canSubmit =
    title.trim().length > 0 && !pathExists && (slug !== "" || parent === "/");

  const { mutate: submit, error, isPending } = useMutation({
    mutationFn: async () => {
      if (!canSubmit) throw new Error("Invalid page configuration");

      if (isDuplicate) {
        await duplicatePage(sourcePath!!, fullPath, title.trim());
      } else {
        await createPage(fullPath, title.trim());
      }
    },
    onSuccess: () => {
      toast.success(isDuplicate ? "Page duplicated" : "Page created");
      router.push(`/web/editor${fullPath}`);
      onCreated?.();
      queryClient.invalidateQueries({ queryKey: ["pages"] });
    },
  });

  return (
    <DialogContent>
      <DialogTitle>
        {isDuplicate ? "Duplicate Page" : "Create Page"}
      </DialogTitle>

      <div className="flex flex-col gap-4">
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="page-title">Title</Label>
          <Input
            ref={titleRef}
            id="page-title"
            placeholder="e.g. About Us"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit) {
                e.preventDefault();
                submit();
              }
            }}
          />
        </div>

        {/* Parent */}
        <div className="relative flex flex-col gap-1.5">
          <Label>Parent</Label>
          <button
            type="button"
            onClick={() => {
              setParentPickerOpen(!parentPickerOpen);
              setParentFilter("");
            }}
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-3xl border border-transparent bg-input/50 px-3 text-sm transition-[color,box-shadow,background-color]",
              "hover:bg-input/70",
              parentPickerOpen &&
                "border-ring ring-3 ring-ring/30"
            )}
          >
            <span className="truncate">
              {parent === "/" ? "/ (root)" : parent}
            </span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                parentPickerOpen && "rotate-180"
              )}
              aria-hidden
            />
          </button>
          {parentPickerOpen && (
            <div className="absolute top-full z-20 mt-1 w-full rounded-2xl border border-border bg-popover p-2 shadow-lg">
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter…"
                  value={parentFilter}
                  onChange={(e) => setParentFilter(e.target.value)}
                  className="h-8 pl-8 text-sm"
                  autoFocus
                />
              </div>
              <ul className="max-h-40 overflow-y-auto">
                {filteredParents.map((p) => {
                  const depth = p.split("/").filter(Boolean).length;
                  return (
                    <li key={p}>
                      <button
                        type="button"
                        onClick={() => {
                          setParent(p);
                          setParentPickerOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent",
                          p === parent && "bg-accent font-medium"
                        )}
                        style={{ paddingLeft: depth * 16 + 8 }}
                      >
                        {p === "/" ? "/ (root)" : p}
                      </button>
                    </li>
                  );
                })}
                {filteredParents.length === 0 && (
                  <li className="px-2 py-1.5 text-sm text-muted-foreground">
                    No matches
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Slug */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="page-slug">Slug</Label>
          <Input
            id="page-slug"
            placeholder={
              parent === "/" ? "Leave empty for homepage" : "url-segment"
            }
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            onBlur={handleSlugBlur}
          />
        </div>

        {/* Path preview */}
        <div className="flex items-center gap-2 rounded-2xl bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">URL:</span>
          <code className="truncate font-mono text-foreground">
            {fullPath}
          </code>
        </div>

        {/* Errors */}
        {validationError && <ErrorLabel message={validationError} />}
        {error && <ErrorLabel message={error.message} />}
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary" size="sm">
            Cancel
          </Button>
        </DialogClose>
        <Button
          size="sm"
          onClick={() => submit()}
          disabled={!canSubmit || isPending}
        >
          {isPending
            ? isDuplicate
              ? "Duplicating…"
              : "Creating…"
            : isDuplicate
              ? "Duplicate"
              : "Create"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

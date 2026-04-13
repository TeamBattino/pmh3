"use client";

import { useState } from "react";
import { Select as SelectPrimitive } from "radix-ui";
import type { CustomFieldRenderProps } from "../lib/custom-field-types";
import { usePagePaths } from "./page-paths-context";

const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

function PagePathSelect({
  value,
  pagePaths,
  onChange,
}: {
  value: string;
  pagePaths: string[];
  onChange: (next: string | undefined) => void;
}) {
  return (
    <SelectPrimitive.Root
      value={value || undefined}
      onValueChange={(v) => onChange(v || undefined)}
    >
      <SelectPrimitive.Trigger
        className="flex w-full items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-900/20 data-[placeholder]:text-gray-500"
        aria-label="Select a page"
      >
        <SelectPrimitive.Value placeholder="Select a page…" />
        <SelectPrimitive.Icon asChild>
          <ChevronDownIcon className="h-4 w-4 opacity-60" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-64 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-gray-200 bg-white text-sm shadow-lg"
        >
          <SelectPrimitive.Viewport className="p-1">
            {pagePaths.map((p) => (
              <SelectPrimitive.Item
                key={p}
                value={p}
                className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 pl-7 text-sm outline-none data-[highlighted]:bg-gray-100 data-[state=checked]:font-medium"
              >
                <span className="absolute left-2 inline-flex h-4 w-4 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <CheckIcon className="h-3.5 w-3.5" />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>{p}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export type UrlFieldValue = string | undefined;

export function UrlFieldRender({
  value,
  onChange,
  placeholder,
}: CustomFieldRenderProps<UrlFieldValue> & { placeholder?: string }) {
  const pagePaths = usePagePaths();
  const current = value ?? "";
  const isKnownPage = pagePaths.includes(current);
  const [mode, setMode] = useState<"page" | "custom">(
    !current || isKnownPage ? "page" : "custom"
  );

  const tabClass = (active: boolean) =>
    active
      ? "flex-1 rounded-md bg-gray-900 px-3 py-1 text-center text-xs font-medium text-white"
      : "flex-1 rounded-md px-3 py-1 text-center text-xs font-medium text-gray-600 hover:bg-gray-100";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("page");
            if (!isKnownPage) onChange(undefined);
          }}
          className={tabClass(mode === "page")}
        >
          Page
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className={tabClass(mode === "custom")}
        >
          Custom URL
        </button>
      </div>
      {mode === "page" ? (
        pagePaths.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-300 px-2 py-3 text-center text-xs text-gray-500">
            No pages available
          </div>
        ) : (
          <PagePathSelect
            value={isKnownPage ? current : ""}
            pagePaths={pagePaths}
            onChange={onChange}
          />
        )
      ) : (
        <input
          type="text"
          value={current}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder={placeholder ?? "https://example.com"}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      )}
    </div>
  );
}

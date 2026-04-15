"use client";

import { useEffect, useState } from "react";
import { Select as SelectPrimitive } from "radix-ui";
import type { CustomFieldRenderProps } from "../lib/custom-field-types";

const ChevronDownIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const CheckIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
import type { GroupDoc } from "../lib/activities";
import type { GroupFieldValue } from "./group-field";

export function GroupFieldRender({
  value,
  onChange,
}: CustomFieldRenderProps<GroupFieldValue>) {
  const [groups, setGroups] = useState<GroupDoc[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/activities/groups")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: GroupDoc[]) => {
        if (!cancelled) setGroups(data);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-700">
        Couldn't load groups: {error}
      </div>
    );
  }
  if (!groups) {
    return <div className="text-xs text-gray-500">Loading groups…</div>;
  }
  if (groups.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-gray-300 p-2 text-xs text-gray-500">
        No groups configured yet. Create groups in Activity Settings first.
      </div>
    );
  }

  return (
    <SelectPrimitive.Root
      value={value ?? ""}
      onValueChange={(v) => onChange(v || undefined)}
    >
      <SelectPrimitive.Trigger
        className="flex h-9 w-full items-center justify-between gap-2 rounded-3xl border border-transparent bg-input/50 px-3 py-1 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow,background-color] outline-none data-[placeholder]:text-muted-foreground hover:bg-input/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <SelectPrimitive.Value placeholder="— pick a group —" />
        <SelectPrimitive.Icon asChild>
          <ChevronDownIcon className="size-4 opacity-60" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          className="z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-2xl border border-border bg-popover text-popover-foreground shadow-md data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1"
        >
          <SelectPrimitive.Viewport className="p-1 min-w-[var(--radix-select-trigger-width)]">
            {groups.map((g) => (
              <SelectPrimitive.Item
                key={g.id}
                value={g.id}
                className="relative flex w-full cursor-default items-center gap-2 rounded-xl py-1.5 pr-8 pl-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                <span className="absolute right-2 flex size-3.5 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <CheckIcon className="size-4" />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>{g.name}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

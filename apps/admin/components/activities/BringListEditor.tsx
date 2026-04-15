"use client";

import * as React from "react";
import * as LucideIcons from "lucide-react";
import {
  GripVertical,
  Plus,
  Search,
  Trash2,
  ChevronDown,
} from "lucide-react";
import type { BringItem } from "@pfadipuck/puck-web/lib/activities";
import { suggestedBringIcons } from "@pfadipuck/puck-web/lib/bring-icons";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import { cn } from "@/lib/cn";

type Props = {
  value: BringItem[];
  onChange: (next: BringItem[]) => void;
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function BringListEditor({ value, onChange }: Props) {
  const items = value ?? [];

  const updateAt = (idx: number, patch: Partial<BringItem>) => {
    const next = items.slice();
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };
  const removeAt = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };
  const addItem = () => {
    onChange([...items, { id: newId(), icon: null, label: "" }]);
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = items.slice();
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-2">
      {items.length === 0 && (
        <div className="px-2 py-3 text-center text-sm text-muted-foreground">
          Noch nichts auf der Liste.
        </div>
      )}
      {items.map((item, idx) => (
        <BringRow
          key={item.id}
          item={item}
          onChangeIcon={(icon) => updateAt(idx, { icon })}
          onChangeLabel={(label) => updateAt(idx, { label })}
          onRemove={() => removeAt(idx)}
          onMoveUp={() => move(idx, idx - 1)}
          onMoveDown={() => move(idx, idx + 1)}
          isFirst={idx === 0}
          isLast={idx === items.length - 1}
        />
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={addItem}
        className="self-start"
      >
        <Plus className="size-4" /> Eintrag hinzufügen
      </Button>
    </div>
  );
}

function BringRow({
  item,
  onChangeIcon,
  onChangeLabel,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  item: BringItem;
  onChangeIcon: (id: string | null) => void;
  onChangeLabel: (label: string) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex flex-col">
        <button
          type="button"
          aria-label="Nach oben"
          onClick={onMoveUp}
          disabled={isFirst}
          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <GripVertical className="size-3 -mb-1 rotate-90" />
        </button>
        <button
          type="button"
          aria-label="Nach unten"
          onClick={onMoveDown}
          disabled={isLast}
          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <GripVertical className="size-3 -mt-1 rotate-90" />
        </button>
      </div>
      <IconPickerButton value={item.icon} onChange={onChangeIcon} />
      <Input
        value={item.label}
        onChange={(e) => onChangeLabel(e.target.value)}
        placeholder="Was sollen die Kinder mitbringen?"
        className="flex-1"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label="Eintrag entfernen"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function IconPickerButton({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Icon wählen"
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted"
        >
          <LucideIconView name={value} fallbackBullet />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[320px] p-3"
      >
        <IconPickerPanel
          value={value}
          onPick={(id) => {
            onChange(id);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function IconPickerPanel({
  value,
  onPick,
}: {
  value: string | null;
  onPick: (id: string | null) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [showAll, setShowAll] = React.useState(false);

  // The full lucide icon name list — derived from the imported namespace
  // only when the user opens "More from library" or types a query.
  const allIconNames = React.useMemo(() => {
    if (!showAll && !query.trim()) return null;
    return Object.keys(LucideIcons).filter(
      (k) =>
        /^[A-Z]/.test(k) &&
        k !== "createLucideIcon" &&
        k !== "default" &&
        // Drop the *Icon aliases lucide ships to avoid duplicates.
        !k.endsWith("Icon")
    );
  }, [showAll, query]);

  const filteredAll = React.useMemo(() => {
    if (!allIconNames) return [];
    const q = query.trim().toLowerCase();
    if (!q) return allIconNames.slice(0, 200);
    return allIconNames
      .filter((n) => n.toLowerCase().includes(q))
      .slice(0, 200);
  }, [allIconNames, query]);

  const filteredSuggested = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suggestedBringIcons;
    return suggestedBringIcons.filter(
      (i) =>
        i.id.toLowerCase().includes(q) ||
        i.label.toLowerCase().includes(q) ||
        i.keywords.some((k) => k.includes(q))
    );
  }, [query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suchen…"
          className="pl-8"
        />
      </div>

      {value && (
        <button
          type="button"
          onClick={() => onPick(null)}
          className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Icon entfernen
        </button>
      )}

      <div>
        <div className="mb-1.5 text-xs font-medium text-muted-foreground">
          Vorschläge
        </div>
        <IconGrid
          names={filteredSuggested.map((i) => i.id)}
          labelById={Object.fromEntries(
            filteredSuggested.map((i) => [i.id, i.label])
          )}
          selected={value}
          onPick={onPick}
          empty="Keine Treffer in den Vorschlägen."
        />
      </div>

      {!showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className="size-3" /> Mehr aus der Bibliothek
        </button>
      )}

      {(showAll || query.trim()) && allIconNames && (
        <div>
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">
            Bibliothek
          </div>
          <IconGrid
            names={filteredAll}
            selected={value}
            onPick={onPick}
            empty="Keine Treffer."
          />
          {filteredAll.length === 200 && (
            <div className="mt-1 text-xs text-muted-foreground">
              Zeige die ersten 200 — verfeinere die Suche.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IconGrid({
  names,
  labelById,
  selected,
  onPick,
  empty,
}: {
  names: string[];
  labelById?: Record<string, string>;
  selected: string | null;
  onPick: (id: string) => void;
  empty: string;
}) {
  if (names.length === 0) {
    return (
      <div className="rounded-md bg-muted px-2 py-3 text-center text-xs text-muted-foreground">
        {empty}
      </div>
    );
  }
  return (
    <div className="grid max-h-[220px] grid-cols-8 gap-1 overflow-y-auto">
      {names.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => onPick(name)}
          title={labelById?.[name] ?? name}
          aria-label={labelById?.[name] ?? name}
          className={cn(
            "flex aspect-square items-center justify-center rounded-md border border-transparent text-foreground hover:bg-muted",
            selected === name && "border-admin-primary bg-muted"
          )}
        >
          <LucideIconView name={name} />
        </button>
      ))}
    </div>
  );
}

function LucideIconView({
  name,
  fallbackBullet = false,
}: {
  name: string | null;
  fallbackBullet?: boolean;
}) {
  if (!name) {
    return fallbackBullet ? (
      <span
        aria-hidden
        className="block size-1.5 rounded-full bg-muted-foreground"
      />
    ) : null;
  }
  const Icon = (LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ className?: string }> | undefined
  >)[name];
  if (!Icon) {
    return (
      <span
        aria-hidden
        className="block size-1.5 rounded-full bg-muted-foreground"
      />
    );
  }
  return <Icon className="size-4" />;
}

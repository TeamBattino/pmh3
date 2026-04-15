"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

import { Button } from "@/components/ui/Button";
import { Calendar } from "@/components/ui/Calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { cn } from "@/lib/cn";

// ── Date-only picker (returns YYYY-MM-DD strings) ─────────────────

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
}: {
  /** YYYY-MM-DD or empty. */
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const date = parseYmd(value);
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 size-4" />
          {date ? format(date, "EEE, d. MMM yyyy", { locale: de }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date ?? undefined}
          onSelect={(d) => {
            if (d) {
              onChange(formatYmd(d));
              setOpen(false);
            }
          }}
          weekStartsOn={1}
          locale={de}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

// ── Time picker (HH:mm) using two Selects ─────────────────────────

export function TimePicker({
  value,
  onChange,
  minuteStep = 5,
  disabled,
  className,
}: {
  /** "HH:mm" or empty. */
  value: string;
  onChange: (next: string) => void;
  /** Step between selectable minutes. */
  minuteStep?: number;
  disabled?: boolean;
  className?: string;
}) {
  const [hourStr, minStr] = value.split(":");
  const hour = hourStr ?? "";
  const min = minStr ?? "";

  const minutes = React.useMemo(() => {
    const out: string[] = [];
    for (let m = 0; m < 60; m += minuteStep) out.push(pad(m));
    // Make sure the current minute is reachable even if it doesn't align.
    if (min && !out.includes(min)) out.push(min);
    return out.sort();
  }, [minuteStep, min]);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Select
        value={hour}
        onValueChange={(h) => onChange(`${h}:${min || "00"}`)}
        disabled={disabled}
      >
        <SelectTrigger size="sm" className="w-20">
          <SelectValue placeholder="hh" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {Array.from({ length: 24 }, (_, i) => pad(i)).map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-sm text-muted-foreground">:</span>
      <Select
        value={min}
        onValueChange={(m) => onChange(`${hour || "00"}:${m}`)}
        disabled={disabled}
      >
        <SelectTrigger size="sm" className="w-20">
          <SelectValue placeholder="mm" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {minutes.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ── Combined date+time picker (returns ISO UTC) ───────────────────

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick a date & time",
  disabled,
  className,
}: {
  /** ISO UTC string or empty. */
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const initial = value ? new Date(value) : null;
  const [open, setOpen] = React.useState(false);
  const ymd = initial ? formatYmd(initial) : "";
  const hm = initial
    ? `${pad(initial.getHours())}:${pad(initial.getMinutes())}`
    : "";

  const update = (nextYmd: string, nextHm: string) => {
    if (!nextYmd) return onChange("");
    const [hStr, mStr] = nextHm.split(":");
    const h = Number(hStr) || 0;
    const m = Number(mStr) || 0;
    const d = parseYmd(nextYmd);
    if (!d) return;
    d.setHours(h, m, 0, 0);
    onChange(d.toISOString());
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !initial && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 size-4" />
          {initial
            ? format(initial, "EEE, d. MMM yyyy 'at' HH:mm", { locale: de })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={initial ?? undefined}
          onSelect={(d) => {
            if (d) update(formatYmd(d), hm || "23:59");
          }}
          weekStartsOn={1}
          locale={de}
          autoFocus
        />
        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
          <span className="text-xs text-muted-foreground">Time</span>
          <TimePicker
            value={hm}
            onChange={(nextHm) => update(ymd || formatYmd(new Date()), nextHm)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── helpers ──────────────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatYmd(d: Date): string {
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate())
  );
}

function parseYmd(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

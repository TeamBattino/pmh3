"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "@/lib/cn";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const defaults = getDefaultClassNames();
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2", className)}
      classNames={{
        ...defaults,
        months: cn(defaults.months, "flex flex-col gap-4"),
        month: cn(defaults.month, "flex flex-col gap-3"),
        month_caption: cn(
          defaults.month_caption,
          "flex h-9 items-center justify-center text-sm font-medium"
        ),
        caption_label: cn(defaults.caption_label, "text-sm font-medium"),
        nav: cn(defaults.nav, "absolute top-1 right-1 flex items-center gap-1"),
        button_previous: cn(
          defaults.button_previous,
          "inline-flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        ),
        button_next: cn(
          defaults.button_next,
          "inline-flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        ),
        month_grid: cn(defaults.month_grid, "w-full border-collapse"),
        weekdays: cn(defaults.weekdays, "flex"),
        weekday: cn(
          defaults.weekday,
          "w-9 text-center text-[0.7rem] font-normal text-muted-foreground"
        ),
        week: cn(defaults.week, "mt-1 flex w-full"),
        day: cn(
          defaults.day,
          "relative size-9 p-0 text-center text-sm focus-within:relative focus-within:z-20"
        ),
        day_button: cn(
          defaults.day_button,
          "inline-flex size-9 items-center justify-center rounded-full p-0 font-normal hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 aria-selected:opacity-100"
        ),
        selected: cn(
          defaults.selected,
          "[&>button]:bg-admin-primary [&>button]:text-admin-primary-foreground [&>button]:hover:bg-admin-primary [&>button]:hover:text-admin-primary-foreground"
        ),
        today: cn(defaults.today, "[&>button]:font-semibold [&>button]:text-admin-primary"),
        outside: cn(defaults.outside, "text-muted-foreground/60"),
        disabled: cn(defaults.disabled, "text-muted-foreground/40 [&>button]:hover:bg-transparent"),
        hidden: cn(defaults.hidden, "invisible"),
        ...classNames,
      }}
      components={{
        Chevron: (chevronProps) => {
          if (chevronProps.orientation === "left")
            return <ChevronLeft className="size-4" />;
          return <ChevronRight className="size-4" />;
        },
      }}
      {...props}
    />
  );
}

export { Calendar };

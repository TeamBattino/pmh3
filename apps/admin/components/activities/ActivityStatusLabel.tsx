import type { EffectiveState } from "@pfadipuck/puck-web/lib/activities";

export function statusLabel(
  state: EffectiveState,
  lastType?: "info" | "cancelled" | "custom"
): string {
  switch (state.kind) {
    case "info":
      return `Info live (${formatZurichDate(state.data.date)} ${state.data.startTime}–${state.data.endTime})`;
    case "cancelled":
      return `Cancelled (until ${formatZurichIso(state.data.showUntil)})`;
    case "custom":
      return `Custom — ${state.data.title} (until ${formatZurichIso(state.data.showUntil)})`;
    case "planning": {
      if (state.reason === "expired" && lastType) {
        return `Planning — ${capitalize(lastType)} expired`;
      }
      return "Planning — nothing published";
    }
  }
}

function capitalize(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}

const dateFmt = new Intl.DateTimeFormat("de-CH", {
  timeZone: "Europe/Zurich",
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});

const dtFmt = new Intl.DateTimeFormat("de-CH", {
  timeZone: "Europe/Zurich",
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatZurichDate(yyyymmdd: string): string {
  const m = yyyymmdd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return yyyymmdd;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  return dateFmt.format(d);
}

export function formatZurichIso(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return dtFmt.format(d);
}

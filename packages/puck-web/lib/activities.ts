import type { RichText } from "@puckeditor/core";

export type ActivityContentType = "info" | "cancelled" | "custom";

export type GroupDoc = {
  id: string;
  name: string;
  sortOrder: number;
  leaderContact?: string;
};

export type LocationDoc = {
  id: string;
  label: string;
  address: string;
  mapsEmbedUrl?: string;
};

/** A location reference — either a saved location by id, or inline custom. */
export type LocationRef =
  | { kind: "saved"; locationId: string }
  | {
      kind: "custom";
      label: string;
      address: string;
      mapsEmbedUrl?: string;
    };

export type BringItem = {
  /** Stable id for keys and reordering. */
  id: string;
  /** Lucide icon name (e.g. "Backpack"). Null = no icon, render a bullet. */
  icon: string | null;
  label: string;
};

export type InfoBlock = {
  /** Local Europe/Zurich date, format YYYY-MM-DD. */
  date: string;
  /** Local time HH:mm. */
  startTime: string;
  endTime: string;
  startLocation?: LocationRef;
  /** Undefined means "same as start". */
  endLocation?: LocationRef;
  title: string;
  description: RichText;
  bringList: BringItem[];
};

export type CancelledBlock = {
  message: string;
  /** ISO UTC datetime. */
  showUntil: string;
};

export type CustomBlock = {
  title: string;
  body: RichText;
  showUntil: string;
};

export type PublishedSnapshot =
  | { type: "info"; data: InfoBlock }
  | { type: "cancelled"; data: CancelledBlock }
  | { type: "custom"; data: CustomBlock };

export type ActivityDoc = {
  groupId: string;
  info: InfoBlock;
  cancelled: CancelledBlock;
  custom: CustomBlock;
  published?: PublishedSnapshot;
  publishedAt?: string;
  updatedAt: string;
  updatedBy?: string;
};

export type PlanningPlaceholder = {
  default: RichText;
  overrides: Record<string, RichText>;
};

export const emptyInfoBlock = (): InfoBlock => ({
  date: "",
  startTime: "",
  endTime: "",
  title: "",
  description: "",
  bringList: [],
});

export const emptyCancelledBlock = (): CancelledBlock => ({
  message: "",
  showUntil: "",
});

export const emptyCustomBlock = (): CustomBlock => ({
  title: "",
  body: "",
  showUntil: "",
});

/**
 * Normalize a possibly-legacy InfoBlock so older docs (where `bringList`
 * was a single richtext string) load cleanly. Splits on newlines, drops
 * empty lines, assigns synthetic ids and a null icon.
 */
export function normalizeInfoBlock(info: InfoBlock): InfoBlock {
  const raw = info.bringList as unknown;
  if (Array.isArray(raw)) {
    return {
      ...info,
      bringList: raw.map((item, i) => ({
        id: typeof item?.id === "string" ? item.id : `legacy-${i}`,
        icon: typeof item?.icon === "string" ? item.icon : null,
        label: typeof item?.label === "string" ? item.label : "",
      })),
    };
  }
  if (typeof raw === "string") {
    const lines = raw
      .replace(/<[^>]+>/g, "\n")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return {
      ...info,
      bringList: lines.map((label, i) => ({
        id: `legacy-${i}`,
        icon: null,
        label,
      })),
    };
  }
  return { ...info, bringList: [] };
}

export const emptyActivityDoc = (groupId: string): ActivityDoc => ({
  groupId,
  info: emptyInfoBlock(),
  cancelled: emptyCancelledBlock(),
  custom: emptyCustomBlock(),
  updatedAt: new Date().toISOString(),
});

export const emptyPlanningPlaceholder = (): PlanningPlaceholder => ({
  default: "",
  overrides: {},
});

/**
 * Extract a Google Maps embed URL from either a raw URL or a full iframe
 * snippet. Returns undefined if the input doesn't contain a valid embed URL.
 */
export function extractMapsEmbedUrl(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const iframeMatch = trimmed.match(/src=["']([^"']+)["']/);
  const url = iframeMatch ? iframeMatch[1] : trimmed;
  if (!url.startsWith("https://www.google.com/maps/embed")) return undefined;
  return url;
}

/**
 * Effective state of an activity at a point in time — what the public site
 * should render for a given group right now.
 */
export type EffectiveState =
  | { kind: "planning"; reason?: "never" | "expired" }
  | { kind: "info"; data: InfoBlock }
  | { kind: "cancelled"; data: CancelledBlock }
  | { kind: "custom"; data: CustomBlock };

/**
 * Compute the effective public-facing state for an activity doc at `now`.
 * Expiry is applied here without mutating stored state.
 */
export function computeEffectiveState(
  doc: ActivityDoc | null | undefined,
  now: Date = new Date()
): EffectiveState {
  if (!doc || !doc.published) {
    return { kind: "planning", reason: "never" };
  }
  const snap = doc.published;
  const nowMs = now.getTime();
  if (snap.type === "info") {
    // Info expires at end datetime (date + endTime, Europe/Zurich).
    const end = parseZurichDateTime(snap.data.date, snap.data.endTime);
    if (end === null || end.getTime() <= nowMs) {
      return { kind: "planning", reason: "expired" };
    }
    return { kind: "info", data: snap.data };
  }
  if (snap.type === "cancelled") {
    const until = snap.data.showUntil
      ? new Date(snap.data.showUntil)
      : null;
    if (!until || until.getTime() <= nowMs) {
      return { kind: "planning", reason: "expired" };
    }
    return { kind: "cancelled", data: snap.data };
  }
  const until = snap.data.showUntil ? new Date(snap.data.showUntil) : null;
  if (!until || until.getTime() <= nowMs) {
    return { kind: "planning", reason: "expired" };
  }
  return { kind: "custom", data: snap.data };
}

/**
 * Parse a YYYY-MM-DD + HH:mm pair interpreted as Europe/Zurich wall-clock
 * time into a UTC Date. Uses Intl to figure out the current Zurich offset.
 */
export function parseZurichDateTime(
  date: string,
  time: string
): Date | null {
  if (!date || !time) return null;
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const t = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m || !t) return null;
  const [, y, mo, d] = m;
  const [, h, mi] = t;
  // Start by interpreting as UTC, then adjust by the Zurich offset.
  const utcGuess = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi)
  );
  const offsetMin = zurichOffsetMinutes(new Date(utcGuess));
  return new Date(utcGuess - offsetMin * 60_000);
}

/** Current Europe/Zurich offset (in minutes east of UTC) for the given date. */
export function zurichOffsetMinutes(d: Date): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Zurich",
    timeZoneName: "shortOffset",
  });
  const parts = fmt.formatToParts(d);
  const tz = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
  const m = tz.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return 60;
  const sign = m[1] === "-" ? -1 : 1;
  const h = Number(m[2]);
  const mm = m[3] ? Number(m[3]) : 0;
  return sign * (h * 60 + mm);
}

/** Next upcoming Saturday in Europe/Zurich as YYYY-MM-DD. */
export function nextSaturdayZurich(now: Date = new Date()): string {
  const zurichNow = new Date(
    now.getTime() + zurichOffsetMinutes(now) * 60_000
  );
  const day = zurichNow.getUTCDay(); // 0=Sun..6=Sat
  const daysUntilSat = (6 - day + 7) % 7 || 7;
  const sat = new Date(zurichNow);
  sat.setUTCDate(zurichNow.getUTCDate() + daysUntilSat);
  return (
    sat.getUTCFullYear() +
    "-" +
    String(sat.getUTCMonth() + 1).padStart(2, "0") +
    "-" +
    String(sat.getUTCDate()).padStart(2, "0")
  );
}

/** Tomorrow 23:59 in Europe/Zurich as ISO UTC. */
export function tomorrow2359ZurichIso(now: Date = new Date()): string {
  const zurichNow = new Date(
    now.getTime() + zurichOffsetMinutes(now) * 60_000
  );
  const y = zurichNow.getUTCFullYear();
  const mo = zurichNow.getUTCMonth();
  const d = zurichNow.getUTCDate() + 1;
  const dateStr =
    y + "-" + String(mo + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
  const dt = parseZurichDateTime(dateStr, "23:59");
  return (dt ?? new Date()).toISOString();
}

export type GroupStatusSummary = {
  groupId: string;
  state: EffectiveState;
  /** Human-readable suffix, e.g. "Info live (Sat 14:00–17:00)". */
  label: string;
};

import type { ComponentConfig, CustomField } from "@puckeditor/core";
import * as LucideIcons from "lucide-react";
import { groupField, type GroupFieldValue } from "../fields/group-field";
import type {
  ActivityDoc,
  BringItem,
  EffectiveState,
  GroupDoc,
  InfoBlock,
  LocationDoc,
  LocationRef,
} from "../lib/activities";
import { computeEffectiveState } from "../lib/activities";

export type ResolvedActivityBoard = {
  group: GroupDoc | null;
  doc: ActivityDoc | null;
  startLocation?: LocationDoc | null;
  endLocation?: LocationDoc | null;
  /** The effective planning-placeholder text (override → default → ""). */
  planningText: string;
};

export type ActivityResolver = (
  groupId: string
) => Promise<ResolvedActivityBoard>;

export type GroupActivityBoardProps = {
  groupId?: GroupFieldValue;
  /** Optional section heading rendered above the board (e.g. "Unsere nächste Aktivität"). */
  sectionTitle?: string;
  /** Populated by `resolveData` from `metadata.resolveActivityData`. */
  _resolved?: ResolvedActivityBoard | null;
};

function GroupActivityBoard({
  groupId,
  sectionTitle,
  _resolved,
}: GroupActivityBoardProps) {
  if (!groupId) {
    return (
      <Wrapper>
        <EmptyNotice>No group selected — pick one in the component settings.</EmptyNotice>
      </Wrapper>
    );
  }
  if (!_resolved) {
    return (
      <Wrapper>
        <EmptyNotice>Loading…</EmptyNotice>
      </Wrapper>
    );
  }

  const { group, doc, startLocation, endLocation, planningText } = _resolved;
  if (!group) {
    return (
      <Wrapper>
        <EmptyNotice>Group not found.</EmptyNotice>
      </Wrapper>
    );
  }

  const state: EffectiveState = computeEffectiveState(doc);
  return (
    <Wrapper sectionTitle={sectionTitle}>
      <BoardBody
        groupName={group.name}
        state={state}
        startLocation={startLocation}
        endLocation={endLocation}
        planningText={planningText}
      />
    </Wrapper>
  );
}

function Wrapper({
  children,
  sectionTitle,
}: {
  children: React.ReactNode;
  sectionTitle?: string;
}) {
  const trimmed = sectionTitle?.trim();
  return (
    <section className="popout py-10">
      <div className="mx-auto max-w-4xl rounded-3xl border border-contrast-ground/15 p-6 sm:p-10">
        {trimmed && (
          <h2 className="mb-8 text-center text-3xl leading-tight tracking-[0.04em] text-contrast-ground sm:text-4xl">
            {trimmed}
          </h2>
        )}
        {children}
      </div>
    </section>
  );
}

function EmptyNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-prose rounded-2xl bg-elevated p-6 text-center text-contrast-ground/60">
      {children}
    </div>
  );
}

function BoardBody({
  groupName,
  state,
  startLocation,
  endLocation,
  planningText,
}: {
  groupName: string;
  state: EffectiveState;
  startLocation?: LocationDoc | null;
  endLocation?: LocationDoc | null;
  planningText: string;
}) {
  if (state.kind === "planning") {
    return (
      <div className="mx-auto flex max-w-prose flex-col items-center gap-4 rounded-2xl bg-elevated p-8 text-center text-contrast-ground/80">
        <div className="flex size-16 items-center justify-center rounded-full bg-ground/40 text-contrast-ground/70">
          <LucideIcons.CalendarDays className="size-8" aria-hidden />
        </div>
        <div className="font-poppins text-base">
          {planningText || "Aktuell sind keine Informationen verfügbar."}
        </div>
      </div>
    );
  }

  if (state.kind === "cancelled") {
    return (
      <div
        role="alert"
        className="mx-auto flex max-w-prose flex-col items-center gap-4 rounded-2xl border border-brand-red/40 bg-elevated p-8 text-center text-contrast-ground"
      >
        <div className="flex size-16 items-center justify-center rounded-full bg-brand-red/15 text-brand-red">
          <LucideIcons.CalendarX2 className="size-8" aria-hidden />
        </div>
        <h2 className="text-3xl text-brand-red">Abgesagt</h2>
        <div className="font-poppins whitespace-pre-wrap text-base text-contrast-ground/80">
          {state.data.message}
        </div>
      </div>
    );
  }

  if (state.kind === "custom") {
    return (
      <div className="mx-auto max-w-prose rounded-2xl bg-elevated p-6 text-contrast-ground/90">
        <h2 className="mb-3 text-3xl">{state.data.title}</h2>
        <div className="whitespace-pre-wrap">
          {typeof state.data.body === "string" ? state.data.body : state.data.body}
        </div>
      </div>
    );
  }

  return (
    <InfoBoard
      groupName={groupName}
      info={state.data}
      startLocation={startLocation}
      endLocation={endLocation}
    />
  );
}

function InfoBoard({
  groupName,
  info,
  startLocation,
  endLocation,
}: {
  groupName: string;
  info: InfoBlock;
  startLocation?: LocationDoc | null;
  endLocation?: LocationDoc | null;
}) {
  const hasEndLocation = !!info.endLocation;
  const startResolved = resolveLocation(info.startLocation, startLocation);
  const endResolved = resolveLocation(info.endLocation, endLocation);
  const items = info.bringList ?? [];
  const hasBringList = items.length > 0;
  const description =
    typeof info.description === "string" ? info.description.trim() : "";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col items-center gap-2 text-center">
        <div className="font-poppins text-sm uppercase tracking-[0.18em] text-contrast-ground/60">
          {formatDateZurich(info.date)}
        </div>
        <div className="font-poppins text-2xl font-medium tabular-nums leading-none tracking-tight text-contrast-ground sm:text-3xl">
          {info.startTime}<span className="mx-4 text-contrast-ground/40">–</span>{info.endTime}
        </div>
        {description && (
          <p className="font-poppins mx-auto mt-2 max-w-prose whitespace-pre-wrap text-base text-contrast-ground/80">
            {description}
          </p>
        )}
      </header>

      {hasEndLocation && endResolved && startResolved ? (
        // Two locations: bring-list across the top (or absent),
        // locations side-by-side below so we never stack two square maps.
        <div className="flex flex-col gap-4">
          {hasBringList && (
            <div className="mx-auto w-full max-w-xl">
              <BringListTile items={items} />
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2 md:items-start">
            <LocationTile variant="start" loc={startResolved} />
            <LocationTile variant="end" loc={endResolved} />
          </div>
        </div>
      ) : (
        // Zero or one location: keep the bring-list ↔ location 2-col layout.
        <div
          className={[
            "grid gap-4",
            hasBringList && startResolved
              ? "md:grid-cols-2 md:items-start"
              : "md:grid-cols-1",
          ].join(" ")}
        >
          {hasBringList && <BringListTile items={items} />}
          {startResolved && (
            <LocationTile variant="neutral" loc={startResolved} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Tiles ────────────────────────────────────────────────────────────

function BringListTile({ items }: { items: BringItem[] }) {
  return (
    <div className="font-poppins rounded-2xl bg-elevated p-6">
      <div className="mb-3 text-xs uppercase tracking-[0.18em] text-contrast-ground/60">
        Mitnehmen
      </div>
      <ul className="mx-auto flex max-w-prose flex-col gap-2.5">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 text-base text-contrast-ground/90"
          >
            <BringIconView name={item.icon} />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type ResolvedLoc = {
  label: string;
  address: string;
  mapsEmbedUrl?: string;
};

function LocationTile({
  variant,
  loc,
}: {
  variant: "start" | "end" | "neutral";
  loc: ResolvedLoc;
}) {
  const heading =
    variant === "start" ? "Treffpunkt" : variant === "end" ? "Schluss" : "Ort";
  const Icon =
    variant === "end" ? LucideIcons.Flag : LucideIcons.MapPin;
  const accentBar =
    variant === "end"
      ? "before:bg-rose-400/70"
      : variant === "start"
        ? "before:bg-emerald-500/70"
        : "before:bg-contrast-ground/30";
  const accentText =
    variant === "end"
      ? "text-rose-600"
      : variant === "start"
        ? "text-emerald-700"
        : "text-contrast-ground/60";

  return (
    <div
      className={[
        "font-poppins relative overflow-hidden rounded-2xl bg-elevated p-6",
        "before:absolute before:left-0 before:top-0 before:h-1.5 before:w-full",
        accentBar,
      ].join(" ")}
    >
      <div
        className={`mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] ${accentText}`}
      >
        <Icon className="size-4" aria-hidden />
        <span>{heading}</span>
      </div>
      <div className="mb-1 text-lg font-medium text-contrast-ground">
        {loc.label}
      </div>
      <div className="mb-3 text-sm text-contrast-ground/70">{loc.address}</div>
      <div className="mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-xl bg-ground/40">
        {loc.mapsEmbedUrl ? (
          <iframe
            src={loc.mapsEmbedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="size-full border-0"
            title={`${heading}: ${loc.label}`}
          />
        ) : (
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(loc.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-full items-center justify-center text-sm text-contrast-ground/70 underline"
          >
            Auf Google Maps öffnen
          </a>
        )}
      </div>
    </div>
  );
}

function BringIconView({ name }: { name: string | null }) {
  if (!name) {
    return (
      <span
        aria-hidden
        className="block size-1.5 shrink-0 rounded-full bg-contrast-ground/50"
      />
    );
  }
  const Icon = (LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ className?: string; "aria-hidden"?: boolean }> | undefined
  >)[name];
  if (!Icon) {
    return (
      <span
        aria-hidden
        className="block size-1.5 shrink-0 rounded-full bg-contrast-ground/50"
      />
    );
  }
  return (
    <Icon
      aria-hidden
      className="size-5 shrink-0 text-contrast-ground/80"
    />
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function resolveLocation(
  ref: LocationRef | undefined,
  saved: LocationDoc | null | undefined
): ResolvedLoc | null {
  if (!ref) return null;
  if (ref.kind === "saved") {
    if (!saved) return null;
    return {
      label: saved.label,
      address: saved.address,
      mapsEmbedUrl: saved.mapsEmbedUrl,
    };
  }
  return {
    label: ref.label,
    address: ref.address,
    mapsEmbedUrl: ref.mapsEmbedUrl,
  };
}

const zurichDateFmt = new Intl.DateTimeFormat("de-CH", {
  timeZone: "Europe/Zurich",
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

function formatDateZurich(yyyymmdd: string): string {
  const m = yyyymmdd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return yyyymmdd;
  const d = new Date(
    Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)
  );
  return zurichDateFmt.format(d);
}

export const groupActivityBoardConfig: ComponentConfig<GroupActivityBoardProps> = {
  label: "Group Activity Board",
  render: GroupActivityBoard,
  fields: {
    sectionTitle: {
      type: "text",
      label: "Section title (optional)",
    },
    groupId: groupField() as CustomField<GroupFieldValue>,
  },
  defaultProps: {
    sectionTitle: "Unsere nächste Aktivität",
  },
  resolveData: async (data, { metadata }) => {
    const resolveActivityData = (
      metadata as { resolveActivityData?: ActivityResolver }
    )?.resolveActivityData;
    const groupId = data.props.groupId;
    let resolved: ResolvedActivityBoard | null = null;
    if (groupId && resolveActivityData) {
      resolved = await resolveActivityData(groupId);
    }
    return {
      ...data,
      props: { ...data.props, _resolved: resolved },
    };
  },
};

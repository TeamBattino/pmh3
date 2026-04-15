import type { ComponentConfig, CustomField } from "@puckeditor/core";
import { groupField, type GroupFieldValue } from "../fields/group-field";
import type {
  ActivityDoc,
  EffectiveState,
  GroupDoc,
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
  /** Populated by `resolveData` from `metadata.resolveActivityData`. */
  _resolved?: ResolvedActivityBoard | null;
};

function GroupActivityBoard({ groupId, _resolved }: GroupActivityBoardProps) {
  if (!groupId) {
    return (
      <div className="popout py-8">
        <div className="rounded-xl bg-elevated p-6 text-center text-contrast-ground/60">
          No group selected — pick one in the component settings.
        </div>
      </div>
    );
  }
  if (!_resolved) {
    return (
      <div className="popout py-8">
        <div className="rounded-xl bg-elevated p-6 text-center text-contrast-ground/60">
          Loading…
        </div>
      </div>
    );
  }

  const { group, doc, startLocation, endLocation, planningText } = _resolved;
  if (!group) {
    return (
      <div className="popout py-8">
        <div className="rounded-xl bg-elevated p-6 text-center text-contrast-ground/60">
          Group not found.
        </div>
      </div>
    );
  }

  // We recompute here on the server at render time so expiry is accurate.
  const state: EffectiveState = computeEffectiveState(doc);

  return (
    <section className="popout py-8">
      <div className="rounded-2xl bg-elevated p-6">
        <h2 className="mb-4 text-xl font-semibold">{group.name}</h2>
        <BoardBody
          state={state}
          startLocation={startLocation}
          endLocation={endLocation}
          planningText={planningText}
        />
      </div>
    </section>
  );
}

function BoardBody({
  state,
  startLocation,
  endLocation,
  planningText,
}: {
  state: EffectiveState;
  startLocation?: LocationDoc | null;
  endLocation?: LocationDoc | null;
  planningText: string;
}) {
  if (state.kind === "planning") {
    return (
      <div className="text-contrast-ground/80">
        {planningText ||
          "Aktuell sind keine Informationen verfügbar."}
      </div>
    );
  }
  if (state.kind === "cancelled") {
    return (
      <div
        role="alert"
        className="rounded-xl border border-amber-400 bg-amber-50 p-4 text-amber-900"
      >
        <div className="mb-1 font-semibold">Abgesagt</div>
        <div className="whitespace-pre-wrap">{state.data.message}</div>
      </div>
    );
  }
  if (state.kind === "custom") {
    return (
      <div>
        <h3 className="mb-2 text-lg font-semibold">{state.data.title}</h3>
        <div className="whitespace-pre-wrap text-contrast-ground/80">
          {typeof state.data.body === "string"
            ? state.data.body
            : state.data.body}
        </div>
      </div>
    );
  }

  // Info
  const info = state.data;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold">{info.title}</h3>
        <div className="text-sm text-contrast-ground/60">
          {formatDateZurich(info.date)} · {info.startTime}–{info.endTime}
        </div>
      </div>
      {info.description && (
        <div className="whitespace-pre-wrap text-contrast-ground/80">
          {typeof info.description === "string"
            ? info.description
            : info.description}
        </div>
      )}
      <LocationView
        label="Start"
        locRef={info.startLocation}
        saved={startLocation}
      />
      {info.endLocation && (
        <LocationView
          label="End"
          locRef={info.endLocation}
          saved={endLocation}
        />
      )}
      {info.bringList && (
        <div>
          <h4 className="mb-1 text-sm font-semibold">Mitnehmen</h4>
          <div className="whitespace-pre-wrap text-sm text-contrast-ground/80">
            {typeof info.bringList === "string"
              ? info.bringList
              : info.bringList}
          </div>
        </div>
      )}
    </div>
  );
}

function LocationView({
  label,
  locRef,
  saved,
}: {
  label: string;
  locRef: LocationRef | undefined;
  saved?: LocationDoc | null;
}) {
  if (!locRef) return null;
  const loc =
    locRef.kind === "saved"
      ? saved
        ? { label: saved.label, address: saved.address, mapsEmbedUrl: saved.mapsEmbedUrl }
        : null
      : {
          label: locRef.label,
          address: locRef.address,
          mapsEmbedUrl: locRef.mapsEmbedUrl,
        };
  if (!loc) return null;

  return (
    <div>
      <h4 className="mb-1 text-sm font-semibold">{label}: {loc.label}</h4>
      <div className="text-sm text-contrast-ground/80">
        {loc.mapsEmbedUrl ? (
          <div className="overflow-hidden rounded-lg">
            <iframe
              src={loc.mapsEmbedUrl}
              width="100%"
              height="240"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              style={{ border: 0 }}
              title={loc.label}
            />
          </div>
        ) : (
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(loc.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {loc.address}
          </a>
        )}
      </div>
    </div>
  );
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
    groupId: groupField() as CustomField<GroupFieldValue>,
  },
  defaultProps: {},
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

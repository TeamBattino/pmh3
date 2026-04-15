"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { toast } from "@/components/ui/Sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { cn } from "@/lib/cn";
import {
  publishActivity,
  saveCancelledDraft,
  saveCustomDraft,
  saveInfoDraft,
  unpublishActivity,
} from "@/lib/activities/actions";
import {
  computeEffectiveState,
  nextSaturdayZurich,
  parseZurichDateTime,
  tomorrow2359ZurichIso,
  type ActivityContentType,
  type ActivityDoc,
  type CancelledBlock,
  type CustomBlock,
  type GroupDoc,
  type InfoBlock,
  type LocationDoc,
  type LocationRef,
} from "@pfadipuck/puck-web/lib/activities";
import { formatZurichIso, statusLabel } from "./ActivityStatusLabel";
import { combineStates, useAutosave } from "./use-autosave";
import {
  DatePicker,
  DateTimePicker,
  TimePicker,
} from "@/components/ui/DatePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  group: GroupDoc;
  initial: ActivityDoc;
  locations: LocationDoc[];
};

export function ActivityEditor({ group, initial, locations }: Props) {
  const [doc, setDoc] = useState<ActivityDoc>(initial);
  const [tab, setTab] = useState<ActivityContentType>(() => {
    return initial.published?.type ?? "info";
  });
  const [publishing, setPublishing] = useState(false);
  const [confirmType, setConfirmType] = useState<ActivityContentType | null>(
    null
  );
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const effective = useMemo(() => computeEffectiveState(doc), [doc]);

  const saveInfo = useCallback(
    (v: InfoBlock) => saveInfoDraft(group.id, v),
    [group.id]
  );
  const saveCancelled = useCallback(
    (v: CancelledBlock) => saveCancelledDraft(group.id, v),
    [group.id]
  );
  const saveCustom = useCallback(
    (v: CustomBlock) => saveCustomDraft(group.id, v),
    [group.id]
  );

  const info = useAutosave({
    value: doc.info,
    initial: initial.info,
    save: saveInfo,
  });
  const cancelled = useAutosave({
    value: doc.cancelled,
    initial: initial.cancelled,
    save: saveCancelled,
  });
  const custom = useAutosave({
    value: doc.custom,
    initial: initial.custom,
    save: saveCustom,
  });

  const saveState = combineStates([info.state, cancelled.state, custom.state]);
  const anyDirty = info.isDirty || cancelled.isDirty || custom.isDirty;

  // Navigation guard: warn whenever any draft has unsaved changes.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (anyDirty || saveState === "saving" || saveState === "error") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [anyDirty, saveState]);

  // Currently-live draft vs snapshot: is there an unpublished diff?
  const hasUnpublishedChanges = useMemo(() => {
    if (!doc.published) return false;
    const p = doc.published;
    if (p.type === "info")
      return JSON.stringify(p.data) !== JSON.stringify(doc.info);
    if (p.type === "cancelled")
      return JSON.stringify(p.data) !== JSON.stringify(doc.cancelled);
    return JSON.stringify(p.data) !== JSON.stringify(doc.custom);
  }, [doc]);

  const requestPublish = () => {
    const publishedType = doc.published?.type;
    const needsConfirm =
      publishedType && publishedType !== tab; // different type
    if (needsConfirm) {
      setConfirmType(tab);
    } else {
      doPublish(tab);
    }
  };

  const doPublish = async (type: ActivityContentType) => {
    setConfirmType(null);
    setPublishing(true);
    setFieldError(null);
    try {
      // Flush any in-flight autosave so the draft on disk matches the
      // snapshot we're about to publish. (Publish also persists the draft
      // server-side as a belt-and-braces, but this still guarantees that
      // the user's last keystroke isn't lost if the publish fails.)
      await Promise.all([info.flush(), cancelled.flush(), custom.flush()]);

      const input =
        type === "info"
          ? { type: "info" as const, data: doc.info }
          : type === "cancelled"
            ? { type: "cancelled" as const, data: doc.cancelled }
            : { type: "custom" as const, data: doc.custom };

      const res = await publishActivity(group.id, input);
      if (!res.ok) {
        setFieldError(res.error);
        toast.error(res.error);
      } else {
        toast.success(
          type === "info"
            ? "Published Info"
            : type === "cancelled"
              ? "Published cancellation"
              : "Published custom message"
        );
        // Update local doc.published optimistically with exactly what we sent.
        setDoc((prev) => ({
          ...prev,
          published: input,
          publishedAt: new Date().toISOString(),
        }));
      }
    } catch (e) {
      console.error(e);
      toast.error("Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  const doUnpublish = async () => {
    setConfirmUnpublish(false);
    setPublishing(true);
    try {
      await unpublishActivity(group.id);
      toast.success("Unpublished — site shows planning placeholder");
      setDoc((prev) => ({
        ...prev,
        published: undefined,
        publishedAt: undefined,
      }));
    } catch (e) {
      console.error(e);
      toast.error("Unpublish failed");
    } finally {
      setPublishing(false);
    }
  };

  // Lazily default Cancelled.showUntil and Custom.showUntil when empty and
  // the tab becomes active.
  useEffect(() => {
    if (tab === "cancelled" && !doc.cancelled.showUntil) {
      setDoc((prev) => ({
        ...prev,
        cancelled: { ...prev.cancelled, showUntil: tomorrow2359ZurichIso() },
      }));
    }
    if (tab === "custom" && !doc.custom.showUntil) {
      setDoc((prev) => ({
        ...prev,
        custom: { ...prev.custom, showUntil: tomorrow2359ZurichIso() },
      }));
    }
  }, [tab, doc.cancelled.showUntil, doc.custom.showUntil]);

  const publishDisabled = useMemo(() => {
    if (publishing) return true;
    const publishedType = doc.published?.type;
    if (publishedType === tab && !hasUnpublishedChanges) return true;
    return false;
  }, [publishing, doc.published, tab, hasUnpublishedChanges]);

  const publishLabel = useMemo(() => {
    const label =
      tab === "info" ? "Publish Info" : tab === "cancelled" ? "Publish Cancellation" : "Publish Custom";
    return label;
  }, [tab]);

  const showSomethingLive =
    effective.kind === "info" ||
    effective.kind === "cancelled" ||
    effective.kind === "custom";

  return (
    <div className="flex flex-col gap-6">
      {/* Status strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Currently on site
          </span>
          <span className="text-sm font-medium">
            {statusLabel(effective, doc.published?.type)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <SaveIndicator state={saveState} />
          {hasUnpublishedChanges && (
            <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-xs text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              Unpublished changes
            </span>
          )}
          {showSomethingLive && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmUnpublish(true)}
              disabled={publishing}
            >
              Unpublish
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["info", "cancelled", "custom"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setFieldError(null);
            }}
            className={cn(
              "relative px-4 py-2 text-sm font-medium capitalize transition-colors",
              tab === t
                ? "text-admin-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t}
            {doc.published?.type === t && (
              <span className="ml-2 inline-block h-2 w-2 rounded-full bg-green-500" />
            )}
            {tab === t && (
              <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-admin-primary" />
            )}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <InfoTab
          value={doc.info}
          locations={locations}
          onChange={(info) => setDoc((prev) => ({ ...prev, info }))}
        />
      )}
      {tab === "cancelled" && (
        <CancelledTab
          value={doc.cancelled}
          onChange={(cancelled) =>
            setDoc((prev) => ({ ...prev, cancelled }))
          }
        />
      )}
      {tab === "custom" && (
        <CustomTab
          value={doc.custom}
          onChange={(custom) => setDoc((prev) => ({ ...prev, custom }))}
        />
      )}

      {fieldError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {fieldError}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          onClick={requestPublish}
          disabled={publishDisabled}
        >
          {publishing ? "Publishing…" : publishLabel}
        </Button>
      </div>

      {/* Confirmation dialogs */}
      <Dialog open={!!confirmType} onOpenChange={(o) => !o && setConfirmType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace live block?</DialogTitle>
            <DialogDescription>
              {`This will replace the live ${capitalize(
                doc.published?.type ?? ""
              )} block with the ${capitalize(confirmType ?? "")}. Continue?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmType(null)}>
              Cancel
            </Button>
            <Button onClick={() => confirmType && doPublish(confirmType)}>
              Publish {capitalize(confirmType ?? "")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmUnpublish}
        onOpenChange={(o) => !o && setConfirmUnpublish(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unpublish?</DialogTitle>
            <DialogDescription>
              {`This will remove ${capitalize(
                doc.published?.type ?? ""
              )} from the site and show the planning placeholder. Continue?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmUnpublish(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={doUnpublish}>
              Unpublish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : "";
}

function SaveIndicator({ state }: { state: import("./use-autosave").AutosaveState }) {
  if (state === "idle") return null;
  return (
    <span className="text-xs text-muted-foreground">
      {state === "saving" && "Saving…"}
      {state === "saved" && "Saved"}
      {state === "error" && "Couldn't save — retrying"}
    </span>
  );
}

// ── Info tab ────────────────────────────────────────────────────────

function InfoTab({
  value,
  locations,
  onChange,
}: {
  value: InfoBlock;
  locations: LocationDoc[];
  onChange: (v: InfoBlock) => void;
}) {
  const update = (patch: Partial<InfoBlock>) => onChange({ ...value, ...patch });
  const timeError = useMemo(() => {
    if (!value.startTime || !value.endTime) return null;
    const s = parseZurichDateTime(value.date || "2025-01-01", value.startTime);
    const e = parseZurichDateTime(value.date || "2025-01-01", value.endTime);
    if (s && e && e.getTime() <= s.getTime())
      return "End time must be after start time.";
    return null;
  }, [value.date, value.startTime, value.endTime]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label>Date</Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <DatePicker
              value={value.date}
              onChange={(date) => update({ date })}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => update({ date: nextSaturdayZurich() })}
          >
            Next Saturday
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>Start time</Label>
          <TimePicker
            value={value.startTime}
            onChange={(startTime) => update({ startTime })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>End time</Label>
          <TimePicker
            value={value.endTime}
            onChange={(endTime) => update({ endTime })}
          />
          {timeError && (
            <p className="text-xs text-destructive">{timeError}</p>
          )}
        </div>
      </div>

      <LocationPicker
        label="Start location"
        locations={locations}
        value={value.startLocation}
        onChange={(v) => update({ startLocation: v })}
      />
      <LocationPicker
        label="End location (leave blank = same as start)"
        locations={locations}
        value={value.endLocation}
        onChange={(v) => update({ endLocation: v })}
      />

      <div className="flex flex-col gap-1.5 md:col-span-2">
        <Label htmlFor="info-title">Title</Label>
        <Input
          id="info-title"
          value={value.title}
          onChange={(e) => update({ title: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5 md:col-span-2">
        <Label htmlFor="info-desc">Description</Label>
        <textarea
          id="info-desc"
          rows={4}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={typeof value.description === "string" ? value.description : ""}
          onChange={(e) => update({ description: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5 md:col-span-2">
        <Label htmlFor="info-bring">Bring list</Label>
        <textarea
          id="info-bring"
          rows={3}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          placeholder="One item per line"
          value={typeof value.bringList === "string" ? value.bringList : ""}
          onChange={(e) => update({ bringList: e.target.value })}
        />
      </div>
    </div>
  );
}

function LocationPicker({
  label,
  locations,
  value,
  onChange,
}: {
  label: string;
  locations: LocationDoc[];
  value: LocationRef | undefined;
  onChange: (v: LocationRef | undefined) => void;
}) {
  const currentId =
    value?.kind === "saved" ? value.locationId :
    value?.kind === "custom" ? "__custom" :
    "__none";
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Select
        value={currentId}
        onValueChange={(v) => {
          if (v === "__none") onChange(undefined);
          else if (v === "__custom")
            onChange({ kind: "custom", label: "", address: "" });
          else onChange({ kind: "saved", locationId: v });
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="— none —" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">— none —</SelectItem>
          {locations.filter((l) => l.id).length > 0 && <SelectSeparator />}
          {locations
            .filter((l) => l.id)
            .map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.label}
              </SelectItem>
            ))}
          <SelectSeparator />
          <SelectItem value="__custom">+ Custom location…</SelectItem>
        </SelectContent>
      </Select>
      {value?.kind === "custom" && (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
          <Input
            placeholder="Label"
            value={value.label}
            onChange={(e) =>
              onChange({ ...value, label: e.target.value })
            }
          />
          <Input
            placeholder="Address"
            value={value.address}
            onChange={(e) =>
              onChange({ ...value, address: e.target.value })
            }
          />
          <Input
            placeholder="Google Maps embed URL (optional)"
            value={value.mapsEmbedUrl ?? ""}
            onChange={(e) =>
              onChange({ ...value, mapsEmbedUrl: e.target.value })
            }
          />
        </div>
      )}
    </div>
  );
}

// ── Cancelled tab ──────────────────────────────────────────────────

function CancelledTab({
  value,
  onChange,
}: {
  value: CancelledBlock;
  onChange: (v: CancelledBlock) => void;
}) {
  const update = (patch: Partial<CancelledBlock>) =>
    onChange({ ...value, ...patch });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cancel-msg">Message</Label>
        <textarea
          id="cancel-msg"
          rows={3}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={value.message}
          onChange={(e) => update({ message: e.target.value })}
        />
      </div>
      <DateTimeUntil
        value={value.showUntil}
        onChange={(showUntil) => update({ showUntil })}
      />
    </div>
  );
}

// ── Custom tab ─────────────────────────────────────────────────────

function CustomTab({
  value,
  onChange,
}: {
  value: CustomBlock;
  onChange: (v: CustomBlock) => void;
}) {
  const update = (patch: Partial<CustomBlock>) =>
    onChange({ ...value, ...patch });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="custom-title">Title</Label>
        <Input
          id="custom-title"
          value={value.title}
          onChange={(e) => update({ title: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="custom-body">Body</Label>
        <textarea
          id="custom-body"
          rows={5}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={typeof value.body === "string" ? value.body : ""}
          onChange={(e) => update({ body: e.target.value })}
        />
      </div>
      <DateTimeUntil
        value={value.showUntil}
        onChange={(showUntil) => update({ showUntil })}
      />
    </div>
  );
}

function DateTimeUntil({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>Show until</Label>
      <DateTimePicker value={value} onChange={onChange} />
      <p className="text-xs text-muted-foreground">
        Will be hidden from the site after {value ? formatZurichIso(value) : "—"}.
      </p>
    </div>
  );
}

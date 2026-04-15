"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { toast } from "@/components/ui/Sonner";
import {
  deleteGroup,
  deleteLocation,
  saveGroup,
  saveLocation,
  savePlanningPlaceholder,
} from "@/lib/activities/actions";
import type {
  GroupDoc,
  LocationDoc,
  PlanningPlaceholder,
} from "@pfadipuck/puck-web/lib/activities";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

// ── Groups section ─────────────────────────────────────────────────

export function ActivitiesSettings({
  initialGroups,
  initialLocations,
  initialPlanning,
}: {
  initialGroups: GroupDoc[];
  initialLocations: LocationDoc[];
  initialPlanning: PlanningPlaceholder;
}) {
  const [groups, setGroups] = useState<GroupDoc[]>(initialGroups);
  return (
    <>
      <GroupsSection groups={groups} onGroupsChange={setGroups} />
      <LocationsSection initial={initialLocations} />
      <PlanningPlaceholderSection initial={initialPlanning} groups={groups} />
    </>
  );
}

export function GroupsSection({
  groups,
  onGroupsChange,
}: {
  groups: GroupDoc[];
  onGroupsChange: (next: GroupDoc[]) => void;
}) {
  const [editing, setEditing] = useState<GroupDoc | null>(null);
  const [isPending, startTransition] = useTransition();
  const [blocked, setBlocked] = useState<{
    name: string;
    references: { path: string; title: string }[];
  } | null>(null);

  const openNew = () =>
    setEditing({
      id: "",
      name: "",
      sortOrder: groups.length,
    });

  const save = (g: GroupDoc) => {
    startTransition(async () => {
      const saved = await saveGroup(g);
      const exists = groups.find((x) => x.id === saved.id);
      onGroupsChange(
        exists
          ? groups.map((x) => (x.id === saved.id ? saved : x))
          : [...groups, saved]
      );
      setEditing(null);
      toast.success("Group saved");
    });
  };

  const remove = (g: GroupDoc) => {
    startTransition(async () => {
      const res = await deleteGroup(g.id);
      if (!res.ok) {
        setBlocked({ name: g.name, references: res.references });
        return;
      }
      onGroupsChange(groups.filter((x) => x.id !== g.id));
      toast.success("Group deleted");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Groups</CardTitle>
        <CardDescription>
          Scout groups that can publish activities.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {groups.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No groups yet.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {groups.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{g.name}</span>
                  {g.leaderContact && (
                    <span className="text-xs text-muted-foreground">
                      {g.leaderContact}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(g)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => remove(g)}
                    disabled={isPending}
                    aria-label="Delete"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <Button variant="outline" size="sm" onClick={openNew} className="self-start">
          <Plus data-icon="inline-start" />
          Add group
        </Button>
      </CardContent>

      {editing && (
        <GroupDialog
          group={editing}
          onCancel={() => setEditing(null)}
          onSave={save}
          pending={isPending}
        />
      )}

      {blocked && (
        <BlockedReferencesDialog
          title={`Cannot delete "${blocked.name}"`}
          description="The following pages still reference this group. Remove or reassign them first."
          items={blocked.references.map((r) => ({
            label: r.title,
            href: `/web/editor${r.path === "/" ? "" : r.path}`,
          }))}
          onClose={() => setBlocked(null)}
        />
      )}
    </Card>
  );
}

function GroupDialog({
  group,
  onCancel,
  onSave,
  pending,
}: {
  group: GroupDoc;
  onCancel: () => void;
  onSave: (g: GroupDoc) => void;
  pending: boolean;
}) {
  const [form, setForm] = useState<GroupDoc>(group);
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{group.id ? "Edit group" : "Add group"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Sort order</Label>
            <Input
              type="number"
              value={form.sortOrder}
              onChange={(e) =>
                setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Leader contact (optional)</Label>
            <Input
              value={form.leaderContact ?? ""}
              onChange={(e) =>
                setForm({ ...form, leaderContact: e.target.value || undefined })
              }
              placeholder="email or phone"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(form)}
            disabled={pending || !form.name.trim()}
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Locations section ──────────────────────────────────────────────

export function LocationsSection({ initial }: { initial: LocationDoc[] }) {
  const [locations, setLocations] = useState<LocationDoc[]>(initial);
  const [editing, setEditing] = useState<LocationDoc | null>(null);
  const [isPending, startTransition] = useTransition();
  const [blocked, setBlocked] = useState<{
    name: string;
    references: { groupId: string; groupName: string }[];
  } | null>(null);

  const openNew = () =>
    setEditing({ id: "", label: "", address: "", mapsEmbedUrl: undefined });

  const save = (loc: LocationDoc) => {
    startTransition(async () => {
      const res = await saveLocation(loc);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setLocations((prev) => {
        const exists = prev.find((x) => x.id === res.location.id);
        return exists
          ? prev.map((x) => (x.id === res.location.id ? res.location : x))
          : [...prev, res.location];
      });
      setEditing(null);
      toast.success("Location saved");
    });
  };

  const remove = (loc: LocationDoc) => {
    startTransition(async () => {
      const res = await deleteLocation(loc.id);
      if (!res.ok) {
        setBlocked({ name: loc.label, references: res.references });
        return;
      }
      setLocations((prev) => prev.filter((x) => x.id !== loc.id));
      toast.success("Location deleted");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reusable locations</CardTitle>
        <CardDescription>
          Addresses that leaders can pick when composing an Info block.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {locations.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No locations yet.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {locations.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{l.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {l.address}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(l)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => remove(l)}
                    disabled={isPending}
                    aria-label="Delete"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <Button variant="outline" size="sm" onClick={openNew} className="self-start">
          <Plus data-icon="inline-start" />
          Add location
        </Button>
      </CardContent>

      {editing && (
        <LocationDialog
          location={editing}
          onCancel={() => setEditing(null)}
          onSave={save}
          pending={isPending}
        />
      )}

      {blocked && (
        <BlockedReferencesDialog
          title={`Cannot delete "${blocked.name}"`}
          description="Still referenced by these groups' activity editors."
          items={blocked.references.map((r) => ({
            label: r.groupName,
            href: `/activities/${r.groupId}`,
          }))}
          onClose={() => setBlocked(null)}
        />
      )}
    </Card>
  );
}

function LocationDialog({
  location,
  onCancel,
  onSave,
  pending,
}: {
  location: LocationDoc;
  onCancel: () => void;
  onSave: (l: LocationDoc) => void;
  pending: boolean;
}) {
  const [form, setForm] = useState<LocationDoc>(location);
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {location.id ? "Edit location" : "Add location"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Label</Label>
            <Input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Pfadiheim Meilen"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Address</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Google Maps embed URL (optional)</Label>
            <Input
              value={form.mapsEmbedUrl ?? ""}
              onChange={(e) =>
                setForm({ ...form, mapsEmbedUrl: e.target.value || undefined })
              }
              placeholder="https://www.google.com/maps/embed?… or <iframe src=…"
            />
            <p className="text-xs text-muted-foreground">
              Paste either the raw URL or the full iframe snippet from Google
              Maps → Share → Embed a map.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(form)}
            disabled={pending || !form.label.trim() || !form.address.trim()}
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Planning placeholder section ───────────────────────────────────

export function PlanningPlaceholderSection({
  initial,
  groups,
}: {
  initial: PlanningPlaceholder;
  groups: GroupDoc[];
}) {
  const [form, setForm] = useState<PlanningPlaceholder>(initial);
  const [expandedOverrides, setExpandedOverrides] = useState<
    Record<string, boolean>
  >({});
  const [isPending, startTransition] = useTransition();

  const isDirty = JSON.stringify(form) !== JSON.stringify(initial);

  const save = () => {
    startTransition(async () => {
      await savePlanningPlaceholder(form);
      toast.success("Planning placeholder saved");
    });
  };

  const defaultText = typeof form.default === "string" ? form.default : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Planning placeholder</CardTitle>
        <CardDescription>
          Shown on the public site when no activity is published (or an
          expired one fell off).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Default</Label>
          <textarea
            rows={3}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={defaultText}
            onChange={(e) => setForm({ ...form, default: e.target.value })}
            placeholder="Aktuell sind keine Informationen verfügbar."
          />
          {!defaultText && (
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              Consider setting a default so the site always shows a friendly
              message.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label>Per-group overrides (optional)</Label>
          {groups.map((g) => {
            const override = form.overrides[g.id];
            const hasOverride = typeof override === "string" && override.length > 0;
            const expanded = expandedOverrides[g.id] ?? hasOverride;
            return (
              <div
                key={g.id}
                className="rounded-lg border border-border p-2"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-sm"
                  onClick={() =>
                    setExpandedOverrides((prev) => ({
                      ...prev,
                      [g.id]: !expanded,
                    }))
                  }
                >
                  <span>{g.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {hasOverride ? "customised" : "using default"}
                  </span>
                </button>
                {expanded && (
                  <textarea
                    rows={2}
                    className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    value={typeof override === "string" ? override : ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        overrides: {
                          ...form.overrides,
                          [g.id]: e.target.value,
                        },
                      })
                    }
                    placeholder={`Override for ${g.name}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={!isDirty || isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Shared blocked-references dialog ───────────────────────────────

function BlockedReferencesDialog({
  title,
  description,
  items,
  onClose,
}: {
  title: string;
  description: string;
  items: { label: string; href: string }[];
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2">
          {items.map((i) => (
            <li key={i.href}>
              <Link
                href={i.href}
                className="text-sm text-admin-primary underline"
              >
                {i.label}
              </Link>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

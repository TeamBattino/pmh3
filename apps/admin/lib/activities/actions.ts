"use server";

import { requireServerPermission } from "@/lib/security/server-guard";
import {
  computeEffectiveState,
  extractMapsEmbedUrl,
  parseZurichDateTime,
  type ActivityDoc,
  type CancelledBlock,
  type CustomBlock,
  type GroupDoc,
  type InfoBlock,
  type LocationDoc,
  type PlanningPlaceholder,
  type PublishedSnapshot,
} from "@pfadipuck/puck-web/lib/activities";
import { revalidatePath } from "next/cache";
import {
  deleteGroup as dbDeleteGroup,
  deleteLocation as dbDeleteLocation,
  findGroupReferencesInPages,
  findLocationReferencesInActivities,
  getActivity as dbGetActivity,
  getOrCreateActivity as dbGetOrCreateActivity,
  getPlanningPlaceholder as dbGetPlanningPlaceholder,
  listGroups as dbListGroups,
  listLocations as dbListLocations,
  patchActivityDrafts as dbPatchActivityDrafts,
  publishActivity as dbPublishActivity,
  savePlanningPlaceholder as dbSavePlanningPlaceholder,
  unpublishActivity as dbUnpublishActivity,
  upsertGroup as dbUpsertGroup,
  upsertLocation as dbUpsertLocation,
} from "./db-activities";

const genId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

// ── Read actions (used by both leaders and admins for the editor) ──

export async function listGroups(): Promise<GroupDoc[]> {
  await requireServerPermission({
    any: ["activity:edit", "activity-admin:edit-settings"],
  });
  return dbListGroups();
}

export async function listLocations(): Promise<LocationDoc[]> {
  await requireServerPermission({
    any: ["activity:edit", "activity-admin:edit-settings"],
  });
  return dbListLocations();
}

export async function getActivity(
  groupId: string
): Promise<ActivityDoc | null> {
  await requireServerPermission({ any: ["activity:edit"] });
  return dbGetActivity(groupId);
}

export async function getOrCreateActivity(
  groupId: string
): Promise<ActivityDoc> {
  await requireServerPermission({ any: ["activity:edit"] });
  return dbGetOrCreateActivity(groupId);
}

// ── Leader actions ─────────────────────────────────────────────────

export async function saveInfoDraft(
  groupId: string,
  info: InfoBlock
): Promise<void> {
  const session = await requireServerPermission({ any: ["activity:edit"] });
  await dbPatchActivityDrafts(groupId, { info }, session.user?.email ?? undefined);
}

export async function saveCancelledDraft(
  groupId: string,
  cancelled: CancelledBlock
): Promise<void> {
  const session = await requireServerPermission({ any: ["activity:edit"] });
  await dbPatchActivityDrafts(groupId, { cancelled }, session.user?.email ?? undefined);
}

export async function saveCustomDraft(
  groupId: string,
  custom: CustomBlock
): Promise<void> {
  const session = await requireServerPermission({ any: ["activity:edit"] });
  await dbPatchActivityDrafts(groupId, { custom }, session.user?.email ?? undefined);
}

function validateInfo(info: InfoBlock): string | null {
  if (!info.date) return "Date is required.";
  if (!info.startTime || !info.endTime) return "Start and end time are required.";
  if (!info.startLocation) return "Start location is required.";
  const start = parseZurichDateTime(info.date, info.startTime);
  const end = parseZurichDateTime(info.date, info.endTime);
  if (!start || !end) return "Invalid date/time.";
  if (end.getTime() <= start.getTime())
    return "End time must be after start time.";
  if (end.getTime() <= Date.now())
    return "Activity end must be in the future.";
  return null;
}

function validateCancelled(b: CancelledBlock): string | null {
  if (!b.message) return "Message is required.";
  if (!b.showUntil) return "Show until is required.";
  if (new Date(b.showUntil).getTime() <= Date.now())
    return "Show-until must be in the future.";
  return null;
}

function validateCustom(b: CustomBlock): string | null {
  if (!b.title) return "Title is required.";
  if (!b.body) return "Body is required.";
  if (!b.showUntil) return "Show until is required.";
  if (new Date(b.showUntil).getTime() <= Date.now())
    return "Show-until must be in the future.";
  return null;
}

export type PublishInput =
  | { type: "info"; data: InfoBlock }
  | { type: "cancelled"; data: CancelledBlock }
  | { type: "custom"; data: CustomBlock };

/**
 * Publish the block whose data the client just saw on screen. Persists the
 * draft first so the publish reflects the same state even if an autosave was
 * mid-flight, then snapshots it as live.
 */
export async function publishActivity(
  groupId: string,
  input: PublishInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireServerPermission({ any: ["activity:edit"] });
  let snapshot: PublishedSnapshot;
  if (input.type === "info") {
    const err = validateInfo(input.data);
    if (err) return { ok: false, error: err };
    snapshot = { type: "info", data: input.data };
  } else if (input.type === "cancelled") {
    const err = validateCancelled(input.data);
    if (err) return { ok: false, error: err };
    snapshot = { type: "cancelled", data: input.data };
  } else {
    const err = validateCustom(input.data);
    if (err) return { ok: false, error: err };
    snapshot = { type: "custom", data: input.data };
  }
  // Persist the draft too, so draft and snapshot agree afterwards.
  await dbPatchActivityDrafts(
    groupId,
    input.type === "info"
      ? { info: input.data }
      : input.type === "cancelled"
        ? { cancelled: input.data }
        : { custom: input.data },
    session.user?.email ?? undefined
  );
  await dbPublishActivity(
    groupId,
    snapshot,
    session.user?.email ?? undefined
  );
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function unpublishActivity(
  groupId: string
): Promise<void> {
  const session = await requireServerPermission({ any: ["activity:edit"] });
  await dbUnpublishActivity(groupId, session.user?.email ?? undefined);
  revalidatePath("/", "layout");
}

// ── Group status summary (for the landing list) ────────────────────

export type GroupListEntry = {
  group: GroupDoc;
  status: ReturnType<typeof computeEffectiveState>;
  /** Last stored publishedType, for "Info expired X" wording. */
  lastPublishedType?: "info" | "cancelled" | "custom";
};

export async function listGroupsWithStatus(): Promise<GroupListEntry[]> {
  await requireServerPermission({
    any: ["activity:edit", "activity-admin:edit-settings"],
  });
  const [groups, _locations] = await Promise.all([
    dbListGroups(),
    dbListLocations(),
  ]);
  const entries: GroupListEntry[] = [];
  for (const g of groups) {
    const doc = await dbGetActivity(g.id);
    const status = computeEffectiveState(doc);
    entries.push({
      group: g,
      status,
      lastPublishedType: doc?.published?.type,
    });
  }
  return entries;
}

// ── Settings actions (admin-only) ──────────────────────────────────

export async function saveGroup(
  group: Omit<GroupDoc, "id"> & { id?: string }
): Promise<GroupDoc> {
  await requireServerPermission({ all: ["activity-admin:edit-settings"] });
  const full: GroupDoc = { ...group, id: group.id || genId() };
  await dbUpsertGroup(full);
  return full;
}

export async function deleteGroup(
  id: string
): Promise<
  | { ok: true }
  | { ok: false; references: { path: string; title: string }[] }
> {
  await requireServerPermission({ all: ["activity-admin:edit-settings"] });
  const refs = await findGroupReferencesInPages(id);
  if (refs.length > 0) return { ok: false, references: refs };
  await dbDeleteGroup(id);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveLocation(
  location: Omit<LocationDoc, "id"> & { id?: string }
): Promise<{ ok: true; location: LocationDoc } | { ok: false; error: string }> {
  await requireServerPermission({ all: ["activity-admin:edit-settings"] });
  let mapsEmbedUrl: string | undefined;
  if (location.mapsEmbedUrl) {
    mapsEmbedUrl = extractMapsEmbedUrl(location.mapsEmbedUrl);
    if (!mapsEmbedUrl) {
      return {
        ok: false,
        error:
          "Paste a Google Maps embed URL or the iframe snippet from Google Maps → Share → Embed a map.",
      };
    }
  }
  const full: LocationDoc = {
    id: location.id || genId(),
    label: location.label,
    address: location.address,
    mapsEmbedUrl,
  };
  await dbUpsertLocation(full);
  return { ok: true, location: full };
}

export async function deleteLocation(
  id: string
): Promise<
  | { ok: true }
  | { ok: false; references: { groupId: string; groupName: string }[] }
> {
  await requireServerPermission({ all: ["activity-admin:edit-settings"] });
  const refs = await findLocationReferencesInActivities(id);
  if (refs.length > 0) return { ok: false, references: refs };
  await dbDeleteLocation(id);
  return { ok: true };
}

/**
 * Used by the Puck editor's `<GroupActivityBoard>` preview. Mirrors the
 * site-side `resolveActivityBoard`.
 */
export async function resolveActivityBoardForEditor(
  groupId: string
): Promise<import("@pfadipuck/puck-web/components/GroupActivityBoard").ResolvedActivityBoard> {
  await requireServerPermission({ any: ["page:update", "admin-ui:read"] });
  const [groups, locations, doc, planning] = await Promise.all([
    dbListGroups(),
    dbListLocations(),
    dbGetActivity(groupId),
    dbGetPlanningPlaceholder(),
  ]);
  const group = groups.find((g) => g.id === groupId) ?? null;
  let startLocation: LocationDoc | null | undefined;
  let endLocation: LocationDoc | null | undefined;
  if (doc?.published?.type === "info") {
    const info = doc.published.data;
    if (info.startLocation?.kind === "saved") {
      const id = info.startLocation.locationId;
      startLocation = locations.find((l) => l.id === id) ?? null;
    }
    if (info.endLocation?.kind === "saved") {
      const id = info.endLocation.locationId;
      endLocation = locations.find((l) => l.id === id) ?? null;
    }
  }
  const override = planning.overrides[groupId];
  const planningText =
    (typeof override === "string" && override) ||
    (typeof planning.default === "string" ? planning.default : "") ||
    "";
  return { group, doc, startLocation, endLocation, planningText };
}

export async function getPlanningPlaceholder(): Promise<PlanningPlaceholder> {
  await requireServerPermission({
    any: ["activity:edit", "activity-admin:edit-settings"],
  });
  return dbGetPlanningPlaceholder();
}

export async function savePlanningPlaceholder(
  data: PlanningPlaceholder
): Promise<void> {
  await requireServerPermission({ all: ["activity-admin:edit-settings"] });
  await dbSavePlanningPlaceholder(data);
  revalidatePath("/", "layout");
}

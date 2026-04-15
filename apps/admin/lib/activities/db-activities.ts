import { env } from "@/lib/env";
import type {
  ActivityDoc,
  GroupDoc,
  LocationDoc,
  PlanningPlaceholder,
  PublishedSnapshot,
} from "@pfadipuck/puck-web/lib/activities";
import {
  emptyActivityDoc,
  emptyPlanningPlaceholder,
} from "@pfadipuck/puck-web/lib/activities";
import { MongoClient, type Db } from "mongodb";

const globalForMongo = globalThis as unknown as {
  _activitiesMongoClient?: MongoClient;
};

function getDb(): Db {
  if (!globalForMongo._activitiesMongoClient) {
    globalForMongo._activitiesMongoClient = new MongoClient(
      env.MONGODB_CONNECTION_STRING
    );
  }
  return globalForMongo._activitiesMongoClient.db(env.MONGODB_DB_NAME);
}

const GROUPS = "activity_groups";
const LOCATIONS = "activity_locations";
const ACTIVITIES = "activities";
const SETTINGS = "activity_settings";

// ── Groups ──────────────────────────────────────────────────────────

export async function listGroups(): Promise<GroupDoc[]> {
  const docs = await getDb().collection(GROUPS).find({}).toArray();
  return docs
    .map((d) => ({
      id: d.id as string,
      name: d.name as string,
      sortOrder: (d.sortOrder as number) ?? 0,
      leaderContact: (d.leaderContact as string | undefined) ?? undefined,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export async function getGroup(id: string): Promise<GroupDoc | null> {
  const d = await getDb().collection(GROUPS).findOne({ id });
  if (!d) return null;
  return {
    id: d.id,
    name: d.name,
    sortOrder: d.sortOrder ?? 0,
    leaderContact: d.leaderContact ?? undefined,
  };
}

export async function upsertGroup(group: GroupDoc): Promise<void> {
  await getDb()
    .collection(GROUPS)
    .updateOne(
      { id: group.id },
      { $set: { ...group } },
      { upsert: true }
    );
}

export async function deleteGroup(id: string): Promise<void> {
  await getDb().collection(GROUPS).deleteOne({ id });
  await getDb().collection(ACTIVITIES).deleteOne({ groupId: id });
}

// ── Locations ───────────────────────────────────────────────────────

export async function listLocations(): Promise<LocationDoc[]> {
  const docs = await getDb().collection(LOCATIONS).find({}).toArray();
  return docs
    .map((d) => ({
      id: d.id as string,
      label: d.label as string,
      address: d.address as string,
      mapsEmbedUrl: (d.mapsEmbedUrl as string | undefined) ?? undefined,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function getLocation(id: string): Promise<LocationDoc | null> {
  const d = await getDb().collection(LOCATIONS).findOne({ id });
  if (!d) return null;
  return {
    id: d.id,
    label: d.label,
    address: d.address,
    mapsEmbedUrl: d.mapsEmbedUrl ?? undefined,
  };
}

export async function upsertLocation(loc: LocationDoc): Promise<void> {
  await getDb()
    .collection(LOCATIONS)
    .updateOne({ id: loc.id }, { $set: { ...loc } }, { upsert: true });
}

export async function deleteLocation(id: string): Promise<void> {
  await getDb().collection(LOCATIONS).deleteOne({ id });
}

// ── Activities ──────────────────────────────────────────────────────

export async function getActivity(
  groupId: string
): Promise<ActivityDoc | null> {
  const d = await getDb().collection(ACTIVITIES).findOne({ groupId });
  if (!d) return null;
  const { _id, ...rest } = d as { _id: unknown } & ActivityDoc;
  return rest as ActivityDoc;
}

export async function getOrCreateActivity(
  groupId: string
): Promise<ActivityDoc> {
  const existing = await getActivity(groupId);
  if (existing) return existing;
  const doc = emptyActivityDoc(groupId);
  await getDb()
    .collection(ACTIVITIES)
    .updateOne({ groupId }, { $setOnInsert: doc }, { upsert: true });
  return doc;
}

/** Autosave: merge a partial patch into the activity doc (drafts only). */
export async function patchActivityDrafts(
  groupId: string,
  patch: Partial<Pick<ActivityDoc, "info" | "cancelled" | "custom">>,
  updatedBy?: string
): Promise<void> {
  const set: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (updatedBy) set.updatedBy = updatedBy;
  if (patch.info) set.info = patch.info;
  if (patch.cancelled) set.cancelled = patch.cancelled;
  if (patch.custom) set.custom = patch.custom;
  await getDb()
    .collection(ACTIVITIES)
    .updateOne({ groupId }, { $set: set }, { upsert: true });
}

export async function publishActivity(
  groupId: string,
  snapshot: PublishedSnapshot,
  updatedBy?: string
): Promise<void> {
  const now = new Date().toISOString();
  const set: Record<string, unknown> = {
    published: snapshot,
    publishedAt: now,
    updatedAt: now,
  };
  if (updatedBy) set.updatedBy = updatedBy;
  await getDb()
    .collection(ACTIVITIES)
    .updateOne({ groupId }, { $set: set }, { upsert: true });
}

export async function unpublishActivity(
  groupId: string,
  updatedBy?: string
): Promise<void> {
  const now = new Date().toISOString();
  const set: Record<string, unknown> = { updatedAt: now };
  if (updatedBy) set.updatedBy = updatedBy;
  await getDb()
    .collection(ACTIVITIES)
    .updateOne(
      { groupId },
      { $set: set, $unset: { published: "", publishedAt: "" } }
    );
}

export async function listAllActivities(): Promise<ActivityDoc[]> {
  const docs = await getDb().collection(ACTIVITIES).find({}).toArray();
  return docs.map((d) => {
    const { _id, ...rest } = d as { _id: unknown } & ActivityDoc;
    return rest as ActivityDoc;
  });
}

// ── Planning placeholder ────────────────────────────────────────────

export async function getPlanningPlaceholder(): Promise<PlanningPlaceholder> {
  const d = await getDb()
    .collection(SETTINGS)
    .findOne({ type: "planningPlaceholder" });
  if (!d) return emptyPlanningPlaceholder();
  return {
    default: d.default ?? "",
    overrides: d.overrides ?? {},
  };
}

export async function savePlanningPlaceholder(
  data: PlanningPlaceholder
): Promise<void> {
  await getDb()
    .collection(SETTINGS)
    .updateOne(
      { type: "planningPlaceholder" },
      { $set: { type: "planningPlaceholder", ...data } },
      { upsert: true }
    );
}

// ── Reference checks ────────────────────────────────────────────────

/**
 * Find Puck pages that reference a given group via <GroupActivityBoard>.
 * Returns the list of paths.
 */
export async function findGroupReferencesInPages(
  groupId: string
): Promise<{ path: string; title: string }[]> {
  const pages = await getDb()
    .collection("puck-data")
    .find({ type: "page" })
    .toArray();
  const hits: { path: string; title: string }[] = [];
  for (const page of pages) {
    const content = (page.data?.content ?? []) as Array<{
      type: string;
      props?: { groupId?: string };
    }>;
    if (
      content.some(
        (c) =>
          c.type === "GroupActivityBoard" && c.props?.groupId === groupId
      )
    ) {
      hits.push({
        path: page.path as string,
        title:
          (page.data?.root?.props?.title as string | undefined) ?? "Untitled",
      });
    }
  }
  return hits;
}

/**
 * Find activities whose Info draft references a given saved location.
 * Returns groupIds (with group names). Drafts count, per E9.
 */
export async function findLocationReferencesInActivities(
  locationId: string
): Promise<{ groupId: string; groupName: string }[]> {
  const activities = await listAllActivities();
  const refs: { groupId: string; groupName: string }[] = [];
  const groupsById = new Map(
    (await listGroups()).map((g) => [g.id, g] as const)
  );
  for (const a of activities) {
    const start = a.info.startLocation;
    const end = a.info.endLocation;
    const hits =
      (start?.kind === "saved" && start.locationId === locationId) ||
      (end?.kind === "saved" && end.locationId === locationId);
    if (hits) {
      refs.push({
        groupId: a.groupId,
        groupName: groupsById.get(a.groupId)?.name ?? a.groupId,
      });
    }
  }
  return refs;
}

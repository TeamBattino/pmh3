import type { FooterDoc } from "@pfadipuck/puck-web/lib/footer-doc";
import type { NavbarData } from "@pfadipuck/puck-web/config/navbar.config";
import type { PageData } from "@pfadipuck/puck-web/config/page.config";
import type {
  ActivityDoc,
  GroupDoc,
  LocationDoc,
  PlanningPlaceholder,
} from "@pfadipuck/puck-web/lib/activities";
import { normalizeInfoBlock } from "@pfadipuck/puck-web/lib/activities";
import type { ResolvedActivityBoard } from "@pfadipuck/puck-web/components/GroupActivityBoard";
import { MongoClient } from "mongodb";

const globalForMongo = globalThis as unknown as { _mongoClient?: MongoClient };

function getClient() {
  if (!globalForMongo._mongoClient) {
    globalForMongo._mongoClient = new MongoClient(process.env.MONGODB_CONNECTION_STRING!);
  }
  return globalForMongo._mongoClient;
}

function getCollection() {
  const client = getClient();
  const db = client.db(process.env.MONGODB_DB_NAME!);
  return db.collection("puck-data");
}

export async function getPage(path: string): Promise<PageData | null> {
  const doc = await getCollection().findOne({ type: "page", path });
  return doc?.data as PageData | null ?? null;
}

export async function getNavbar(): Promise<NavbarData> {
  const doc = await getCollection().findOne({ type: "navbar" });
  return doc!.data as NavbarData;
}

function db() {
  return getClient().db(process.env.MONGODB_DB_NAME!);
}

export async function resolveActivityBoard(
  groupId: string
): Promise<ResolvedActivityBoard> {
  const [groupDoc, activityDoc, planningDoc] = await Promise.all([
    db().collection("activity_groups").findOne({ id: groupId }),
    db().collection("activities").findOne({ groupId }),
    db().collection("activity_settings").findOne({ type: "planningPlaceholder" }),
  ]);

  const group: GroupDoc | null = groupDoc
    ? {
        id: groupDoc.id,
        name: groupDoc.name,
        sortOrder: groupDoc.sortOrder ?? 0,
        leaderContact: groupDoc.leaderContact ?? undefined,
      }
    : null;

  let doc: ActivityDoc | null = null;
  if (activityDoc) {
    const { _id, ...rest } = activityDoc as { _id: unknown } & ActivityDoc;
    doc = rest as ActivityDoc;
    doc.info = normalizeInfoBlock(doc.info);
    if (doc.published?.type === "info") {
      doc.published = {
        type: "info",
        data: normalizeInfoBlock(doc.published.data),
      };
    }
  }

  // Resolve referenced saved locations.
  const idsToFetch = new Set<string>();
  if (doc?.published?.type === "info") {
    const info = doc.published.data;
    if (info.startLocation?.kind === "saved")
      idsToFetch.add(info.startLocation.locationId);
    if (info.endLocation?.kind === "saved")
      idsToFetch.add(info.endLocation.locationId);
  }
  const locDocs = idsToFetch.size
    ? await db()
        .collection("activity_locations")
        .find({ id: { $in: [...idsToFetch] } })
        .toArray()
    : [];
  const byId = new Map<string, LocationDoc>();
  for (const l of locDocs) {
    byId.set(l.id, {
      id: l.id,
      label: l.label,
      address: l.address,
      mapsEmbedUrl: l.mapsEmbedUrl ?? undefined,
    });
  }

  let startLocation: LocationDoc | null | undefined;
  let endLocation: LocationDoc | null | undefined;
  if (doc?.published?.type === "info") {
    const info = doc.published.data;
    if (info.startLocation?.kind === "saved") {
      startLocation = byId.get(info.startLocation.locationId) ?? null;
    }
    if (info.endLocation?.kind === "saved") {
      endLocation = byId.get(info.endLocation.locationId) ?? null;
    }
  }

  const planning: PlanningPlaceholder = planningDoc
    ? {
        default: planningDoc.default ?? "",
        overrides: planningDoc.overrides ?? {},
      }
    : { default: "", overrides: {} };
  const override = planning.overrides[groupId];
  const planningText =
    (typeof override === "string" && override) ||
    (typeof planning.default === "string" ? planning.default : "") ||
    "";

  return { group, doc, startLocation, endLocation, planningText };
}

export async function getFooter(): Promise<FooterDoc> {
  const doc = await getCollection().findOne({ type: "footer" });
  const stored = (doc?.data ?? {}) as Partial<FooterDoc>;
  return {
    columns: stored.columns ?? [],
    legalLinks: stored.legalLinks ?? [],
  };
}

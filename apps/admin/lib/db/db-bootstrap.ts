import { defaultFooterDoc } from "@pfadipuck/puck-web/lib/footer-doc";
import { defaultNavbarData } from "@pfadipuck/puck-web/config/navbar.config";
import { defaultSecurityConfig } from "@/lib/security/security-config";
import type { MongoService } from "./db-mongo-impl";

/**
 * Idempotently create the file system collections and indexes. Split out so
 * integration tests that don't need puck-web can call it independently of
 * `ensureSeeded()`.
 */
export async function ensureFileSystemIndexes(
  service: MongoService
): Promise<void> {
  const db = service.rawDb();

  const collections = await db.listCollections().toArray();
  const names = new Set(collections.map((c) => c.name));

  for (const name of [
    service.filesCollectionName,
    service.foldersCollectionName,
    service.collectionsCollectionName,
    service.collectionFilesCollectionName,
  ]) {
    if (!names.has(name)) await db.createCollection(name);
  }

  const files = db.collection(service.filesCollectionName);
  await files.createIndex({ uuid: 1 }, { unique: true });
  await files.createIndex({ kind: 1 });
  await files.createIndex({ folderId: 1 });
  await files.createIndex({ originalFilename: "text" });

  const folders = db.collection(service.foldersCollectionName);
  await folders.createIndex({ parentId: 1, sortOrder: 1 });
  await folders.createIndex({ ancestorIds: 1 });
  // One-time migration: earlier versions stored slugs as
  // `"{parentId}:{base}"` so a single `{ slug: 1 }` unique index could
  // enforce uniqueness. That leaked the parentId prefix into the URL
  // (colons break Next's route matching → 404). Fix: rewrite legacy
  // composite slugs to their clean form, drop the old global-unique
  // index, install the compound per-parent unique index.
  const legacy = await folders.find({ slug: { $regex: /:/ } }).toArray();
  for (const f of legacy) {
    const rawSlug: unknown = (f as { slug?: unknown }).slug;
    if (typeof rawSlug !== "string") continue;
    const parts = rawSlug.split(":");
    const base = parts.slice(1).join(":") || rawSlug;
    const parent = (f as { parentId?: unknown }).parentId ?? null;
    // Re-resolve uniqueness within the parent for the cleaned base.
    let candidate = base;
    let i = 1;
    while (true) {
      const clash = await folders.findOne({
        slug: candidate,
        parentId: parent,
        _id: { $ne: (f as { _id: unknown })._id },
      } as Record<string, unknown>);
      if (!clash) break;
      i += 1;
      candidate = `${base}-${i}`;
    }
    if (candidate !== rawSlug) {
      await folders.updateOne(
        { _id: (f as { _id: unknown })._id } as Record<string, unknown>,
        { $set: { slug: candidate } }
      );
    }
  }
  try {
    await folders.dropIndex("slug_1");
  } catch {
    // Index may not exist on a fresh DB — that's fine.
  }
  await folders.createIndex({ parentId: 1, slug: 1 }, { unique: true });
  await folders.createIndex(
    { isSystemFolder: 1 },
    { partialFilterExpression: { isSystemFolder: true } }
  );

  const collectionsCol = db.collection(service.collectionsCollectionName);
  await collectionsCol.createIndex({ parentId: 1, sortOrder: 1 });
  await collectionsCol.createIndex({ slug: 1 }, { unique: true });
  await collectionsCol.createIndex(
    { isSystemAlbum: 1 },
    { partialFilterExpression: { isSystemAlbum: true } }
  );

  const junction = db.collection(service.collectionFilesCollectionName);
  await junction.createIndex({ fileId: 1 });
  await junction.createIndex(
    { collectionId: 1, fileId: 1 },
    { unique: true }
  );
  await junction.createIndex({ collectionId: 1, sortOrder: 1 });
}

/**
 * Idempotently seed a MongoService with the application's default navbar,
 * footer, and security config on first run. Extracted from MongoService so
 * the CRUD layer has zero coupling to puck-web's component graph —
 * importing those runtime values pulls in React and breaks the Node test
 * runner's worker IPC.
 */
export async function ensureSeeded(service: MongoService): Promise<void> {
  const db = service.rawDb();

  // Ensure pages collection + path index
  const existing = await db
    .listCollections({ name: service.puckDataCollectionName })
    .toArray();
  if (existing.length === 0) {
    await db.createCollection(service.puckDataCollectionName);
    await db.collection(service.puckDataCollectionName).createIndex({ path: 1 });
  }
  await db
    .collection(service.puckDataCollectionName)
    .createIndex({ type: 1, updatedAt: -1 });

  // Seed navbar if missing
  const navbar = await db
    .collection(service.puckDataCollectionName)
    .findOne({ type: "navbar" });
  if (!navbar) {
    console.log("Navbar data not found, creating with default data");
    await service.saveNavbar(defaultNavbarData);
  }

  // Seed footer if missing
  const footer = await db
    .collection(service.puckDataCollectionName)
    .findOne({ type: "footer" });
  if (!footer) {
    console.log("Footer data not found, creating with default data");
    await service.saveFooter(defaultFooterDoc);
  }

  // Seed security config if missing
  const security = await db
    .collection(service.securityCollectionName)
    .findOne({ type: "securityConfig" });
  if (!security) {
    console.log("Security config not found, creating with default data");
    await service.saveSecurityConfig(defaultSecurityConfig);
  }

  // File system: create collections + indexes and seed system containers.
  await ensureFileSystemIndexes(service);
  await service.ensureSystemFolder();
  await service.ensureSystemAlbum();
}

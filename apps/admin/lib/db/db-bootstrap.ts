import { defaultFooterData } from "@pfadipuck/puck-web/config/footer.config";
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
  await folders.createIndex({ slug: 1 }, { unique: true });
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
    await service.saveFooter(defaultFooterData);
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

import type { FooterData } from "@pfadipuck/puck-web/config/footer.config";
import type { NavbarData } from "@pfadipuck/puck-web/config/navbar.config";
import type { PageData } from "@pfadipuck/puck-web/config/page.config";
import type { SecurityConfig } from "@/lib/security/security-config";
import type { Data } from "@measured/puck";
import { Db, MongoClient, ObjectId, type Filter, type WithId } from "mongodb";
import type { DatabaseService } from "./db";
import type {
  BulkDeleteResult,
  CollectionRecord,
  CollectionType,
  CreateCollectionInput,
  CreateFileInput,
  CreateFolderInput,
  DeleteFileResult,
  FileKind,
  FileRecord,
  FolderRecord,
  PageArgs,
  Reference,
  RemoveFromAlbumResult,
  ReplaceFileInput,
  SearchQuery,
  UpdateCollectionPatch,
  UpdateFilePatch,
  UpdateFolderPatch,
} from "./file-system-types";

type FileDoc = {
  uuid: string;
  kind: FileKind;
  folderId: ObjectId | null;
  originalFilename: string;
  altText: string | null;
  mimeType: string;
  sizeBytes: number;
  s3Key: string;
  thumbSmKey: string | null;
  thumbMdKey: string | null;
  width: number | null;
  height: number | null;
  blurhash: string | null;
  uploadedAt: Date;
  uploadedBy: string | null;
  updatedAt?: Date;
};

type FolderDoc = {
  name: string;
  slug: string;
  parentId: ObjectId | null;
  ancestorIds: ObjectId[];
  level: number;
  sortOrder: number;
  isSystemFolder: boolean;
  createdAt: Date;
};

type CollectionDoc = {
  type: CollectionType;
  title: string;
  slug: string;
  description: string | null;
  year: number | null;
  coverFileId: ObjectId | null;
  parentId: ObjectId | null;
  sortOrder: number;
  isSystemAlbum: boolean;
  createdAt: Date;
};

type CollectionFileDoc = {
  collectionId: ObjectId;
  fileId: ObjectId;
  sortOrder: number;
  addedAt: Date;
};

const MAX_FOLDER_LEVEL = 2;

/**
 * MongoDB implementation of DatabaseService — pure CRUD, no coupling to
 * application defaults. First-run seeding lives in `db-bootstrap.ts` and
 * is applied by the lazy getter in `db.ts`.
 */
export class MongoService implements DatabaseService {
  private client: MongoClient;
  private db: Db;
  readonly puckDataCollectionName = "puck-data";
  readonly securityCollectionName = "security";
  readonly filesCollectionName = "files";
  readonly foldersCollectionName = "folders";
  readonly collectionsCollectionName = "collections";
  readonly collectionFilesCollectionName = "collection_files";

  constructor(connectionString: string, dbName: string) {
    this.client = new MongoClient(connectionString);
    this.db = this.client.db(dbName);
  }

  /**
   * Raw DB handle, exposed so the bootstrap helper can idempotently create
   * collections and indexes without reaching through higher-level CRUD.
   */
  rawDb(): Db {
    return this.db;
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  // ── Puck data / pages ────────────────────────────────────────────────

  async savePage(path: string, data: Data): Promise<void> {
    await this.db
      .collection(this.puckDataCollectionName)
      .updateOne(
        { type: "page", path: path },
        { $set: { data: data, type: "page", path: path } },
        { upsert: true }
      );
  }

  async deletePage(path: string): Promise<void> {
    await this.db
      .collection(this.puckDataCollectionName)
      .deleteOne({ type: "page", path: path });
  }

  async getPage(path: string): Promise<PageData | undefined> {
    const result = await this.db
      .collection(this.puckDataCollectionName)
      .findOne({ type: "page", path: path });
    return result ? result.data : undefined;
  }

  async saveNavbar(data: NavbarData): Promise<void> {
    await this.db
      .collection(this.puckDataCollectionName)
      .updateOne(
        { type: "navbar" },
        { $set: { data: data, type: "navbar" } },
        { upsert: true }
      );
  }

  async getNavbar(): Promise<NavbarData> {
    const result = await this.db
      .collection(this.puckDataCollectionName)
      .findOne({ type: "navbar" });
    if (!result) throw new Error("Navbar data not found");
    return result.data;
  }

  async saveFooter(data: FooterData): Promise<void> {
    await this.db
      .collection(this.puckDataCollectionName)
      .updateOne(
        { type: "footer" },
        { $set: { data: data, type: "footer" } },
        { upsert: true }
      );
  }

  async getFooter(): Promise<FooterData> {
    const result = await this.db
      .collection(this.puckDataCollectionName)
      .findOne({ type: "footer" });
    if (!result) throw new Error("Footer data not found");
    return result.data;
  }

  async getAllPaths(): Promise<string[]> {
    const pages = await this.db
      .collection(this.puckDataCollectionName)
      .find({ type: "page" })
      .toArray();
    return pages.map((page) => page.path);
  }

  async getSecurityConfig(): Promise<SecurityConfig> {
    const result = await this.db
      .collection(this.securityCollectionName)
      .findOne({ type: "securityConfig" });
    if (!result) throw new Error("Security config not found");
    return result.data;
  }

  async saveSecurityConfig(securityConfig: SecurityConfig): Promise<void> {
    await this.db
      .collection(this.securityCollectionName)
      .updateOne(
        { type: "securityConfig" },
        { $set: { data: securityConfig, type: "securityConfig" } },
        { upsert: true }
      );
  }

  // ── File system: files ──────────────────────────────────────────────

  async createFile(input: CreateFileInput): Promise<FileRecord> {
    const files = this.db.collection<FileDoc>(this.filesCollectionName);
    const doc: FileDoc = {
      uuid: input.uuid,
      kind: input.kind,
      folderId:
        input.pool.kind === "documents"
          ? new ObjectId(input.pool.folderId)
          : null,
      originalFilename: input.originalFilename,
      altText: input.altText,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      s3Key: input.s3Key,
      thumbSmKey: input.thumbSmKey,
      thumbMdKey: input.thumbMdKey,
      width: input.width,
      height: input.height,
      blurhash: input.blurhash,
      uploadedAt: new Date(),
      uploadedBy: null, // TODO: populate after Keycloak migration
    };
    const { insertedId } = await files.insertOne(doc);

    if (input.pool.kind === "media") {
      await this.insertCollectionFileMembership(
        insertedId,
        new ObjectId(input.pool.albumId)
      );
    }

    return this.mapFileDoc({ ...doc, _id: insertedId } as WithId<FileDoc>);
  }

  async getFile(id: string): Promise<FileRecord | null> {
    if (!ObjectId.isValid(id)) return null;
    const doc = await this.db
      .collection<FileDoc>(this.filesCollectionName)
      .findOne({ _id: new ObjectId(id) });
    return doc ? this.mapFileDoc(doc) : null;
  }

  async updateFile(id: string, patch: UpdateFilePatch): Promise<void> {
    if (!ObjectId.isValid(id)) return;
    const $set: Partial<FileDoc> = { updatedAt: new Date() };
    if (patch.originalFilename !== undefined)
      $set.originalFilename = patch.originalFilename;
    if (patch.altText !== undefined) $set.altText = patch.altText;
    await this.db
      .collection<FileDoc>(this.filesCollectionName)
      .updateOne({ _id: new ObjectId(id) }, { $set });
  }

  async replaceFile(id: string, input: ReplaceFileInput): Promise<void> {
    if (!ObjectId.isValid(id)) return;
    await this.db.collection<FileDoc>(this.filesCollectionName).updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          s3Key: input.s3Key,
          thumbSmKey: input.thumbSmKey,
          thumbMdKey: input.thumbMdKey,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          width: input.width,
          height: input.height,
          blurhash: input.blurhash,
          updatedAt: new Date(),
        },
      }
    );
    // Caller is responsible for deleting `previousKeys` from S3 — the DB
    // layer stays storage-agnostic.
  }

  async deleteFile(id: string): Promise<DeleteFileResult> {
    if (!ObjectId.isValid(id)) return { status: "deleted" };
    const refs = await this.findFileReferencesInPuckData(id);
    if (refs.length > 0) return { status: "blocked", references: refs };

    const _id = new ObjectId(id);
    await this.db
      .collection<FileDoc>(this.filesCollectionName)
      .deleteOne({ _id });
    await this.db
      .collection<CollectionFileDoc>(this.collectionFilesCollectionName)
      .deleteMany({ fileId: _id });
    return { status: "deleted" };
  }

  async bulkDeleteFiles(ids: string[]): Promise<BulkDeleteResult> {
    const deleted: string[] = [];
    const blocked: Array<{ fileId: string; references: Reference[] }> = [];
    for (const id of ids) {
      const result = await this.deleteFile(id);
      if (result.status === "deleted") deleted.push(id);
      else blocked.push({ fileId: id, references: result.references });
    }
    return { deleted, blocked };
  }

  async searchFiles(q: SearchQuery): Promise<FileRecord[]> {
    const filter: Filter<FileDoc> = {};
    if (q.kind) filter.kind = q.kind;
    if (q.folderId && ObjectId.isValid(q.folderId))
      filter.folderId = new ObjectId(q.folderId);
    if (q.text && q.text.trim().length > 0) {
      // Simple case-insensitive substring match. Text index is present on
      // `originalFilename` but regex here is cheaper for short queries.
      filter.originalFilename = { $regex: escapeRegex(q.text), $options: "i" };
    }
    const docs = await this.db
      .collection<FileDoc>(this.filesCollectionName)
      .find(filter)
      .sort({ uploadedAt: -1 })
      .limit(200)
      .toArray();
    return docs.map((d) => this.mapFileDoc(d));
  }

  async findFileReferencesInPuckData(fileId: string): Promise<Reference[]> {
    if (!ObjectId.isValid(fileId) && !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
      return [];
    }
    const needle = fileId;
    // Narrow to documents that at least mention the fileId as a substring.
    // JSON.stringify on each doc gives us the same guarantee without needing
    // a text index. This is the only file system query that touches puck-data.
    const docs = await this.db
      .collection(this.puckDataCollectionName)
      .find({})
      .toArray();

    const refs: Reference[] = [];
    for (const doc of docs) {
      const pageId =
        doc.type === "page"
          ? (doc.path as string)
          : doc.type === "navbar"
            ? "__navbar__"
            : doc.type === "footer"
              ? "__footer__"
              : null;
      if (!pageId) continue;
      if (!doc.data) continue;
      if (!JSON.stringify(doc.data).includes(needle)) continue;
      walkPuckDataForFileId(doc.data, needle, pageId, refs);
    }
    return refs;
  }

  // ── File system: folders (Documents pool) ───────────────────────────

  async getFolderTree(): Promise<FolderRecord[]> {
    await this.ensureSystemFolder();
    const docs = await this.db
      .collection<FolderDoc>(this.foldersCollectionName)
      .find({})
      .sort({ level: 1, sortOrder: 1, name: 1 })
      .toArray();
    return docs.map((d) => this.mapFolderDoc(d));
  }

  async createFolder(input: CreateFolderInput): Promise<FolderRecord> {
    const folders = this.db.collection<FolderDoc>(this.foldersCollectionName);
    let level = 0;
    let ancestorIds: ObjectId[] = [];
    let parentObjectId: ObjectId | null = null;
    if (input.parentId) {
      if (!ObjectId.isValid(input.parentId))
        throw new Error("Invalid parentId");
      parentObjectId = new ObjectId(input.parentId);
      const parent = await folders.findOne({ _id: parentObjectId });
      if (!parent) throw new Error("Parent folder not found");
      if (parent.level >= MAX_FOLDER_LEVEL)
        throw new Error("Folder nesting limit reached (max 3 levels)");
      level = parent.level + 1;
      ancestorIds = [...parent.ancestorIds, parent._id];
    }

    const slug = await this.nextUniqueFolderSlug(
      slugify(input.name),
      parentObjectId
    );
    const doc: FolderDoc = {
      name: input.name,
      slug,
      parentId: parentObjectId,
      ancestorIds,
      level,
      sortOrder: Date.now(),
      isSystemFolder: false,
      createdAt: new Date(),
    };
    const { insertedId } = await folders.insertOne(doc);
    return this.mapFolderDoc({ ...doc, _id: insertedId } as WithId<FolderDoc>);
  }

  async updateFolder(id: string, patch: UpdateFolderPatch): Promise<void> {
    if (!ObjectId.isValid(id)) return;
    const folders = this.db.collection<FolderDoc>(this.foldersCollectionName);
    const _id = new ObjectId(id);
    const current = await folders.findOne({ _id });
    if (!current) throw new Error("Folder not found");
    if (current.isSystemFolder)
      throw new Error("System folders cannot be modified");

    const $set: Partial<FolderDoc> = {};
    if (patch.name !== undefined) {
      $set.name = patch.name;
      $set.slug = await this.nextUniqueFolderSlug(
        slugify(patch.name),
        current.parentId,
        _id
      );
    }
    if (patch.parentId !== undefined) {
      let newParentId: ObjectId | null = null;
      let newLevel = 0;
      let newAncestors: ObjectId[] = [];
      if (patch.parentId) {
        if (!ObjectId.isValid(patch.parentId))
          throw new Error("Invalid parentId");
        newParentId = new ObjectId(patch.parentId);
        if (newParentId.equals(_id))
          throw new Error("Cannot move a folder into itself");
        const parent = await folders.findOne({ _id: newParentId });
        if (!parent) throw new Error("New parent folder not found");
        if (parent.ancestorIds.some((a) => a.equals(_id)))
          throw new Error("Cannot move a folder into its own descendant");
        newLevel = parent.level + 1;
        newAncestors = [...parent.ancestorIds, parent._id];
      }
      // Enforce max depth across the subtree being moved.
      const subtreeMaxLevel = await this.subtreeMaxLevel(_id, current.level);
      const depthDelta = newLevel - current.level;
      if (subtreeMaxLevel + depthDelta > MAX_FOLDER_LEVEL)
        throw new Error("Move would exceed folder nesting limit");

      $set.parentId = newParentId;
      $set.level = newLevel;
      $set.ancestorIds = newAncestors;

      // Update descendants.
      const descendants = await folders
        .find({ ancestorIds: _id })
        .toArray();
      for (const d of descendants) {
        const relativeAncestors = d.ancestorIds.slice(
          d.ancestorIds.findIndex((a) => a.equals(_id))
        );
        const newDescAncestors = [...newAncestors, ...relativeAncestors];
        await folders.updateOne(
          { _id: d._id },
          {
            $set: {
              ancestorIds: newDescAncestors,
              level: newDescAncestors.length,
            },
          }
        );
      }
    }
    if (Object.keys($set).length > 0)
      await folders.updateOne({ _id }, { $set });
  }

  async deleteFolder(id: string): Promise<void> {
    if (!ObjectId.isValid(id)) return;
    const _id = new ObjectId(id);
    const folders = this.db.collection<FolderDoc>(this.foldersCollectionName);
    const current = await folders.findOne({ _id });
    if (!current) return;
    if (current.isSystemFolder)
      throw new Error("System folders cannot be deleted");
    // Block if non-empty.
    const childFolder = await folders.findOne({ parentId: _id });
    if (childFolder) throw new Error("Folder is not empty");
    const childFile = await this.db
      .collection<FileDoc>(this.filesCollectionName)
      .findOne({ folderId: _id });
    if (childFile) throw new Error("Folder is not empty");
    await folders.deleteOne({ _id });
  }

  async listFolderFiles(
    folderId: string,
    page: PageArgs
  ): Promise<FileRecord[]> {
    if (!ObjectId.isValid(folderId)) return [];
    const docs = await this.db
      .collection<FileDoc>(this.filesCollectionName)
      .find({ folderId: new ObjectId(folderId) })
      .sort({ uploadedAt: -1 })
      .skip(page.offset)
      .limit(page.limit)
      .toArray();
    return docs.map((d) => this.mapFileDoc(d));
  }

  async moveFilesToFolder(
    fileIds: string[],
    targetFolderId: string
  ): Promise<void> {
    if (!ObjectId.isValid(targetFolderId))
      throw new Error("Invalid target folder id");
    const folder = await this.db
      .collection<FolderDoc>(this.foldersCollectionName)
      .findOne({ _id: new ObjectId(targetFolderId) });
    if (!folder) throw new Error("Target folder not found");
    const ids = fileIds
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));
    if (ids.length === 0) return;
    // Only move files that are actually in the Documents pool (folderId
    // non-null). Silently ignore Media files to keep pool disjointness.
    await this.db
      .collection<FileDoc>(this.filesCollectionName)
      .updateMany(
        { _id: { $in: ids }, folderId: { $ne: null } },
        { $set: { folderId: new ObjectId(targetFolderId) } }
      );
  }

  // ── File system: collections (Media pool) ───────────────────────────

  async getCollectionTree(): Promise<CollectionRecord[]> {
    await this.ensureSystemAlbum();
    const docs = await this.db
      .collection<CollectionDoc>(this.collectionsCollectionName)
      .find({})
      .sort({ type: 1, sortOrder: 1, title: 1 })
      .toArray();
    return docs.map((d) => this.mapCollectionDoc(d));
  }

  async createCollection(
    input: CreateCollectionInput
  ): Promise<CollectionRecord> {
    const collections = this.db.collection<CollectionDoc>(
      this.collectionsCollectionName
    );
    let parentObjectId: ObjectId | null = null;
    if (input.type === "album_collection") {
      if (input.parentId)
        throw new Error("Album collections are always top-level");
    } else if (input.type === "album") {
      if (!input.parentId)
        throw new Error(
          "Albums must belong to an album collection (system album exempt)"
        );
      if (!ObjectId.isValid(input.parentId))
        throw new Error("Invalid parentId");
      parentObjectId = new ObjectId(input.parentId);
      const parent = await collections.findOne({ _id: parentObjectId });
      if (!parent || parent.type !== "album_collection")
        throw new Error("Album parent must be an album collection");
    }
    const slug = await this.nextUniqueCollectionSlug(slugify(input.title));
    const doc: CollectionDoc = {
      type: input.type,
      title: input.title,
      slug,
      description: null,
      year: null,
      coverFileId: null,
      parentId: parentObjectId,
      sortOrder: Date.now(),
      isSystemAlbum: false,
      createdAt: new Date(),
    };
    const { insertedId } = await collections.insertOne(doc);
    return this.mapCollectionDoc({
      ...doc,
      _id: insertedId,
    } as WithId<CollectionDoc>);
  }

  async updateCollection(
    id: string,
    patch: UpdateCollectionPatch
  ): Promise<void> {
    if (!ObjectId.isValid(id)) return;
    const collections = this.db.collection<CollectionDoc>(
      this.collectionsCollectionName
    );
    const _id = new ObjectId(id);
    const current = await collections.findOne({ _id });
    if (!current) throw new Error("Collection not found");
    if (current.isSystemAlbum)
      throw new Error("System albums cannot be modified");
    const $set: Partial<CollectionDoc> = {};
    if (patch.title !== undefined) {
      $set.title = patch.title;
      $set.slug = await this.nextUniqueCollectionSlug(slugify(patch.title), _id);
    }
    if (patch.description !== undefined) $set.description = patch.description;
    if (patch.coverFileId !== undefined)
      $set.coverFileId =
        patch.coverFileId && ObjectId.isValid(patch.coverFileId)
          ? new ObjectId(patch.coverFileId)
          : null;
    if (Object.keys($set).length > 0)
      await collections.updateOne({ _id }, { $set });
  }

  async deleteCollection(id: string): Promise<void> {
    if (!ObjectId.isValid(id)) return;
    const _id = new ObjectId(id);
    const collections = this.db.collection<CollectionDoc>(
      this.collectionsCollectionName
    );
    const current = await collections.findOne({ _id });
    if (!current) return;
    if (current.isSystemAlbum)
      throw new Error("System albums cannot be deleted");

    if (current.type === "album_collection") {
      const hasChildren = await collections.findOne({ parentId: _id });
      if (hasChildren) throw new Error("Album collection is not empty");
    } else {
      const hasFiles = await this.db
        .collection<CollectionFileDoc>(this.collectionFilesCollectionName)
        .findOne({ collectionId: _id });
      if (hasFiles) throw new Error("Album is not empty");
    }
    await collections.deleteOne({ _id });
  }

  async listCollectionFiles(
    collectionId: string,
    page: PageArgs
  ): Promise<FileRecord[]> {
    if (!ObjectId.isValid(collectionId)) return [];
    const memberships = await this.db
      .collection<CollectionFileDoc>(this.collectionFilesCollectionName)
      .find({ collectionId: new ObjectId(collectionId) })
      .sort({ addedAt: -1 })
      .skip(page.offset)
      .limit(page.limit)
      .toArray();
    if (memberships.length === 0) return [];
    const fileIds = memberships.map((m) => m.fileId);
    const files = await this.db
      .collection<FileDoc>(this.filesCollectionName)
      .find({ _id: { $in: fileIds } })
      .toArray();
    const byId = new Map(files.map((f) => [f._id.toString(), f]));
    return memberships
      .map((m) => byId.get(m.fileId.toString()))
      .filter((d): d is WithId<FileDoc> => !!d)
      .map((d) => this.mapFileDoc(d));
  }

  async addFilesToAlbum(
    fileIds: string[],
    targetAlbumId: string
  ): Promise<void> {
    if (!ObjectId.isValid(targetAlbumId))
      throw new Error("Invalid album id");
    const albumObjectId = new ObjectId(targetAlbumId);
    const album = await this.db
      .collection<CollectionDoc>(this.collectionsCollectionName)
      .findOne({ _id: albumObjectId });
    if (!album || album.type !== "album")
      throw new Error("Target must be an album");
    for (const fileId of fileIds) {
      if (!ObjectId.isValid(fileId)) continue;
      const fileObjectId = new ObjectId(fileId);
      const file = await this.db
        .collection<FileDoc>(this.filesCollectionName)
        .findOne({ _id: fileObjectId });
      if (!file) continue;
      if (file.folderId !== null) continue; // Media pool only.
      await this.insertCollectionFileMembership(fileObjectId, albumObjectId);
    }
  }

  async removeFilesFromAlbum(
    fileIds: string[],
    sourceAlbumId: string
  ): Promise<RemoveFromAlbumResult> {
    if (!ObjectId.isValid(sourceAlbumId))
      throw new Error("Invalid album id");
    const albumObjectId = new ObjectId(sourceAlbumId);
    const junction = this.db.collection<CollectionFileDoc>(
      this.collectionFilesCollectionName
    );
    const removed: string[] = [];
    const blocked: string[] = [];
    for (const fileId of fileIds) {
      if (!ObjectId.isValid(fileId)) continue;
      const fileObjectId = new ObjectId(fileId);
      const count = await junction.countDocuments({ fileId: fileObjectId });
      if (count <= 1) {
        // Last album — block.
        blocked.push(fileId);
        continue;
      }
      const res = await junction.deleteOne({
        collectionId: albumObjectId,
        fileId: fileObjectId,
      });
      if (res.deletedCount > 0) removed.push(fileId);
    }
    return { removed, blocked };
  }

  async findOrphanFiles(): Promise<FileRecord[]> {
    const files = await this.db
      .collection<FileDoc>(this.filesCollectionName)
      .find({})
      .toArray();
    const orphans: FileRecord[] = [];
    for (const file of files) {
      if (file.folderId !== null) {
        // Documents pool: orphan iff folder no longer exists.
        const folder = await this.db
          .collection<FolderDoc>(this.foldersCollectionName)
          .findOne({ _id: file.folderId });
        if (!folder) orphans.push(this.mapFileDoc(file));
        continue;
      }
      // Media pool: orphan iff zero `collection_files` rows.
      const membership = await this.db
        .collection<CollectionFileDoc>(this.collectionFilesCollectionName)
        .findOne({ fileId: file._id });
      if (!membership) orphans.push(this.mapFileDoc(file));
    }
    return orphans;
  }

  async resolveCollectionRef(collectionId: string): Promise<string[]> {
    if (!ObjectId.isValid(collectionId)) return [];
    const memberships = await this.db
      .collection<CollectionFileDoc>(this.collectionFilesCollectionName)
      .find({ collectionId: new ObjectId(collectionId) })
      .sort({ sortOrder: 1, addedAt: 1 })
      .toArray();
    return memberships.map((m) => m.fileId.toString());
  }

  // ── Seeding helpers ─────────────────────────────────────────────────

  /**
   * Idempotently seed the CMS Uploads system folder. Called from
   * `getFolderTree` so the first UI read produces a usable state even on a
   * fresh database.
   */
  async ensureSystemFolder(): Promise<void> {
    const folders = this.db.collection<FolderDoc>(this.foldersCollectionName);
    const existing = await folders.findOne({ isSystemFolder: true });
    if (existing) return;
    const doc: FolderDoc = {
      name: "CMS Uploads",
      slug: "cms-uploads",
      parentId: null,
      ancestorIds: [],
      level: 0,
      sortOrder: -1,
      isSystemFolder: true,
      createdAt: new Date(),
    };
    await folders.insertOne(doc);
  }

  async ensureSystemAlbum(): Promise<void> {
    const collections = this.db.collection<CollectionDoc>(
      this.collectionsCollectionName
    );
    const existing = await collections.findOne({ isSystemAlbum: true });
    if (existing) return;
    const doc: CollectionDoc = {
      type: "album",
      title: "CMS Uploads",
      slug: "cms-uploads",
      description: null,
      year: null,
      coverFileId: null,
      parentId: null,
      sortOrder: -1,
      isSystemAlbum: true,
      createdAt: new Date(),
    };
    await collections.insertOne(doc);
  }

  // ── Internal helpers ────────────────────────────────────────────────

  private async insertCollectionFileMembership(
    fileId: ObjectId,
    collectionId: ObjectId
  ): Promise<void> {
    try {
      await this.db
        .collection<CollectionFileDoc>(this.collectionFilesCollectionName)
        .insertOne({
          collectionId,
          fileId,
          sortOrder: Date.now(),
          addedAt: new Date(),
        });
    } catch (err) {
      // Duplicate (already a member) — silently succeed. This makes the
      // add-to-album operation idempotent as promised in the plan.
      if ((err as { code?: number }).code !== 11000) throw err;
    }
  }

  private async nextUniqueFolderSlug(
    base: string,
    parentId: ObjectId | null,
    ignoreId?: ObjectId
  ): Promise<string> {
    const folders = this.db.collection<FolderDoc>(this.foldersCollectionName);
    const key = `${parentId?.toString() ?? "root"}:${base}`;
    let candidate = key;
    let i = 1;
    while (true) {
      const filter: Filter<FolderDoc> = { slug: candidate };
      if (ignoreId) filter._id = { $ne: ignoreId };
      const clash = await folders.findOne(filter);
      if (!clash) return candidate;
      i += 1;
      candidate = `${key}-${i}`;
    }
  }

  private async nextUniqueCollectionSlug(
    base: string,
    ignoreId?: ObjectId
  ): Promise<string> {
    const collections = this.db.collection<CollectionDoc>(
      this.collectionsCollectionName
    );
    let candidate = base || "untitled";
    let i = 1;
    while (true) {
      const filter: Filter<CollectionDoc> = { slug: candidate };
      if (ignoreId) filter._id = { $ne: ignoreId };
      const clash = await collections.findOne(filter);
      if (!clash) return candidate;
      i += 1;
      candidate = `${base || "untitled"}-${i}`;
    }
  }

  private async subtreeMaxLevel(
    rootId: ObjectId,
    rootLevel: number
  ): Promise<number> {
    const folders = this.db.collection<FolderDoc>(this.foldersCollectionName);
    const descendants = await folders
      .find({ ancestorIds: rootId })
      .sort({ level: -1 })
      .limit(1)
      .toArray();
    return descendants[0]?.level ?? rootLevel;
  }

  private mapFileDoc(doc: WithId<FileDoc>): FileRecord {
    return {
      id: doc._id.toString(),
      uuid: doc.uuid,
      kind: doc.kind,
      folderId: doc.folderId?.toString() ?? null,
      originalFilename: doc.originalFilename,
      altText: doc.altText,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      s3Key: doc.s3Key,
      thumbSmKey: doc.thumbSmKey,
      thumbMdKey: doc.thumbMdKey,
      width: doc.width,
      height: doc.height,
      blurhash: doc.blurhash,
      uploadedAt: doc.uploadedAt,
      uploadedBy: doc.uploadedBy,
    };
  }

  private mapFolderDoc(doc: WithId<FolderDoc>): FolderRecord {
    return {
      id: doc._id.toString(),
      name: doc.name,
      slug: doc.slug,
      parentId: doc.parentId?.toString() ?? null,
      ancestorIds: doc.ancestorIds.map((a) => a.toString()),
      level: doc.level,
      sortOrder: doc.sortOrder,
      isSystemFolder: doc.isSystemFolder,
      createdAt: doc.createdAt,
    };
  }

  private mapCollectionDoc(doc: WithId<CollectionDoc>): CollectionRecord {
    return {
      id: doc._id.toString(),
      type: doc.type,
      title: doc.title,
      slug: doc.slug,
      description: doc.description,
      year: doc.year,
      coverFileId: doc.coverFileId?.toString() ?? null,
      parentId: doc.parentId?.toString() ?? null,
      sortOrder: doc.sortOrder,
      isSystemAlbum: doc.isSystemAlbum,
      createdAt: doc.createdAt,
    };
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/**
 * Walk a Puck `Data` blob (or navbar/footer data) looking for string props
 * that equal or contain the given file id. Collects `{componentId, propPath}`
 * for every hit.
 *
 * Handles:
 *   - Page data: `{ content: [...], root: {...}, zones: {...} }`
 *   - Any other object with content-like arrays
 *
 * The walk is defensive — component shapes are loose.
 */
function walkPuckDataForFileId(
  data: unknown,
  needle: string,
  pageId: string,
  out: Reference[]
): void {
  const visitComponent = (comp: unknown) => {
    if (!comp || typeof comp !== "object") return;
    const c = comp as {
      type?: string;
      props?: Record<string, unknown> & { id?: string };
    };
    const componentId = c.props?.id ?? c.type ?? "unknown";
    if (c.props) {
      for (const [key, value] of Object.entries(c.props)) {
        walkProp(value, [key], (propPath) => {
          out.push({ pageId, componentId, propPath });
        });
      }
    }
  };

  const walkProp = (
    value: unknown,
    path: string[],
    hit: (p: string) => void
  ): void => {
    if (value == null) return;
    if (typeof value === "string") {
      if (value === needle || value.includes(needle)) hit(path.join("."));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((v, i) => walkProp(v, [...path, String(i)], hit));
      return;
    }
    if (typeof value === "object") {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        walkProp(v, [...path, k], hit);
      }
    }
  };

  if (!data || typeof data !== "object") return;
  const d = data as {
    content?: unknown[];
    zones?: Record<string, unknown[]>;
    root?: unknown;
  };
  if (Array.isArray(d.content)) d.content.forEach(visitComponent);
  if (d.zones && typeof d.zones === "object") {
    for (const zone of Object.values(d.zones)) {
      if (Array.isArray(zone)) zone.forEach(visitComponent);
    }
  }
  if (d.root) visitComponent(d.root);
}

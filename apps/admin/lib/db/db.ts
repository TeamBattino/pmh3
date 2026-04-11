import type { FooterData } from "@pfadipuck/puck-web/config/footer.config";
import type { NavbarData } from "@pfadipuck/puck-web/config/navbar.config";
import type { PageData } from "@pfadipuck/puck-web/config/page.config";
import { env } from "@/lib/env";
import type { SecurityConfig } from "@/lib/security/security-config";
import type { Data } from "@measured/puck";
import { ensureSeeded } from "./db-bootstrap";
import { MongoService } from "./db-mongo-impl";
import type {
  BulkDeleteResult,
  CollectionRecord,
  CreateCollectionInput,
  CreateFileInput,
  CreateFolderInput,
  DeleteFileResult,
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

export interface DatabaseService {
  savePage(path: string, data: Data): Promise<void>;
  deletePage(path: string): Promise<void>;
  getPage(path: string): Promise<PageData | undefined>;
  saveNavbar(data: NavbarData): Promise<void>;
  getNavbar(): Promise<NavbarData>;
  saveFooter(data: FooterData): Promise<void>;
  getFooter(): Promise<FooterData>;
  getAllPaths(): Promise<string[]>;
  getSecurityConfig(): Promise<SecurityConfig>;
  saveSecurityConfig(RoleConfig: SecurityConfig): Promise<void>;

  // ── File system: files ──────────────────────────────────────────────
  createFile(input: CreateFileInput): Promise<FileRecord>;
  getFile(id: string): Promise<FileRecord | null>;
  updateFile(id: string, patch: UpdateFilePatch): Promise<void>;
  replaceFile(id: string, input: ReplaceFileInput): Promise<void>;
  deleteFile(id: string): Promise<DeleteFileResult>;
  bulkDeleteFiles(ids: string[]): Promise<BulkDeleteResult>;
  searchFiles(q: SearchQuery): Promise<FileRecord[]>;
  findFileReferencesInPuckData(fileId: string): Promise<Reference[]>;

  // ── File system: folders (Documents pool) ───────────────────────────
  getFolderTree(): Promise<FolderRecord[]>;
  createFolder(input: CreateFolderInput): Promise<FolderRecord>;
  updateFolder(id: string, patch: UpdateFolderPatch): Promise<void>;
  deleteFolder(id: string): Promise<void>;
  listFolderFiles(folderId: string, page: PageArgs): Promise<FileRecord[]>;
  moveFilesToFolder(fileIds: string[], targetFolderId: string): Promise<void>;

  // ── File system: collections (Media pool) ───────────────────────────
  getCollectionTree(): Promise<CollectionRecord[]>;
  createCollection(input: CreateCollectionInput): Promise<CollectionRecord>;
  updateCollection(id: string, patch: UpdateCollectionPatch): Promise<void>;
  deleteCollection(id: string): Promise<void>;
  listCollectionFiles(
    collectionId: string,
    page: PageArgs
  ): Promise<FileRecord[]>;
  addFilesToAlbum(fileIds: string[], targetAlbumId: string): Promise<void>;
  removeFilesFromAlbum(
    fileIds: string[],
    sourceAlbumId: string
  ): Promise<RemoveFromAlbumResult>;

  /** Returns the ordered list of file ids that currently belong to an album. */
  resolveCollectionRef(collectionId: string): Promise<string[]>;

  /**
   * File records that have fallen out of both pools — a Documents file
   * whose folder was somehow deleted, or a Media file with zero album
   * memberships. Used by the manual orphan GC.
   */
  findOrphanFiles(): Promise<FileRecord[]>;
}

let _dbServicePromise: Promise<DatabaseService> | undefined;

/**
 * Internal Database Service (lazy, seeded on first use).
 * DIRECT ACCESS - BYPASSES PERMISSION CHECKS.
 * Use only in trusted server contexts. For UI/Client access, go through
 * @lib/db/db-actions.ts instead.
 *
 * Returns a promise so that:
 *  (1) construction is deferred until first request — `next build` never
 *      touches MongoDB;
 *  (2) the one-shot `ensureSeeded()` bootstrap runs exactly once per
 *      process, and concurrent callers all await the same promise.
 */
export function getDbService(): Promise<DatabaseService> {
  if (!_dbServicePromise) {
    _dbServicePromise = (async () => {
      const service = new MongoService(
        env.MONGODB_CONNECTION_STRING,
        env.MONGODB_DB_NAME
      );
      await ensureSeeded(service);
      return service;
    })();
  }
  return _dbServicePromise;
}

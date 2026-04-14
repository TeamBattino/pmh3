import type { FooterData } from "@pfadipuck/puck-web/config/footer.config";
import type { NavbarData } from "@pfadipuck/puck-web/config/navbar.config";
import type { PageData } from "@pfadipuck/puck-web/config/page.config";
import { env } from "@/lib/env";
import type { SecurityConfig } from "@/lib/security/security-config";
import type { Data } from "@puckeditor/core";

/** OAuth client registered for downstream services. */
export type AuthClient = {
  clientId: string;
  clientSecretHash: string;
  name: string;
  description: string;
  redirectUris: string[];
};
import { ensureSeeded } from "./db-bootstrap";
import { MongoService } from "./db-mongo-impl";
import type {
  BulkDeleteResult,
  CascadeDeletePreview,
  CascadeDeleteResult,
  CollectionRecord,
  CreateCollectionInput,
  CreateFileInput,
  CreateFolderInput,
  DeleteFileResult,
  FileRecord,
  FolderRecord,
  MediaSettings,
  PageArgs,
  Reference,
  RemoveFromAlbumResult,
  ReplaceFileInput,
  SearchQuery,
  UpdateCollectionPatch,
  UpdateFilePatch,
  UpdateFolderPatch,
} from "./file-system-types";

export type PageListItem = {
  path: string;
  title: string;
  updatedAt: string | null; // ISO string
};

export interface DatabaseService {
  savePage(path: string, data: Data): Promise<void>;
  deletePage(path: string): Promise<void>;
  getPage(path: string): Promise<PageData | undefined>;
  saveNavbar(data: NavbarData): Promise<void>;
  getNavbar(): Promise<NavbarData>;
  saveFooter(data: FooterData): Promise<void>;
  getFooter(): Promise<FooterData>;
  getAllPaths(): Promise<string[]>;
  getAllPages(): Promise<PageListItem[]>;
  getSecurityConfig(): Promise<SecurityConfig>;
  saveSecurityConfig(RoleConfig: SecurityConfig): Promise<void>;

  // ── OAuth clients ──────────────────────────────────────────────────
  getAuthClients(): Promise<AuthClient[]>;
  getAuthClient(clientId: string): Promise<AuthClient | null>;
  saveAuthClient(client: AuthClient): Promise<void>;
  deleteAuthClient(clientId: string): Promise<void>;

  // ── File system: files ──────────────────────────────────────────────
  createFile(input: CreateFileInput): Promise<FileRecord>;
  getFile(id: string): Promise<FileRecord | null>;
  updateFile(id: string, patch: UpdateFilePatch): Promise<void>;
  replaceFile(id: string, input: ReplaceFileInput): Promise<void>;
  deleteFile(id: string): Promise<DeleteFileResult>;
  bulkDeleteFiles(ids: string[]): Promise<BulkDeleteResult>;
  /** Set passwordProtected on one or more files in a single update. */
  setFilesPasswordProtected(
    ids: string[],
    passwordProtected: boolean
  ): Promise<void>;
  searchFiles(q: SearchQuery): Promise<FileRecord[]>;
  findFileReferencesInPuckData(fileId: string): Promise<Reference[]>;

  // ── File system: folders (Documents pool) ───────────────────────────
  getFolderTree(): Promise<FolderRecord[]>;
  createFolder(input: CreateFolderInput): Promise<FolderRecord>;
  updateFolder(id: string, patch: UpdateFolderPatch): Promise<void>;
  deleteFolder(id: string): Promise<void>;
  /**
   * Read-only walk of the folder's subtree that returns counts plus any
   * referenced files that would block a cascade. Used by the confirmation
   * modal so the user sees the consequences before committing.
   */
  previewCascadeDeleteFolder(id: string): Promise<CascadeDeletePreview>;
  /**
   * Atomically delete a folder and everything beneath it (descendant
   * folders + all their files). Hard-aborts if any file has puck-data
   * references — no partial deletion. Returns the s3 keys the caller
   * should free on success.
   */
  cascadeDeleteFolder(id: string): Promise<CascadeDeleteResult>;
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

  /**
   * Returns the number of files in each album, keyed by album id. Albums
   * with zero files are omitted. Cheap single aggregation — scales with the
   * number of memberships, not the number of albums.
   */
  getAlbumFileCounts(): Promise<Record<string, number>>;

  /** Returns the number of albums a specific file currently belongs to. */
  getFileAlbumCount(fileId: string): Promise<number>;

  /** Returns the ordered list of file ids that currently belong to an album. */
  resolveCollectionRef(collectionId: string): Promise<string[]>;

  /**
   * File records that have fallen out of both pools — a Documents file
   * whose folder was somehow deleted, or a Media file with zero album
   * memberships. Used by the manual orphan GC.
   */
  findOrphanFiles(): Promise<FileRecord[]>;

  // ── Settings ────────────────────────────────────────────────────────
  getMediaSettings(): Promise<MediaSettings>;
  setMediaPassword(password: string): Promise<void>;
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

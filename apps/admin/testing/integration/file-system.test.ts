import {
  MongoDBContainer,
  type StartedMongoDBContainer,
} from "@testcontainers/mongodb";
import { ObjectId } from "mongodb";
import type { Data } from "@puckeditor/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureFileSystemIndexes } from "@/lib/db/db-bootstrap";
import { MongoService } from "@/lib/db/db-mongo-impl";

// Cast helper — the Puck `Data` generic requires concrete component props
// which we don't care about in these tests. Localized, typed once.
const asData = (d: unknown): Data => d as Data;

/**
 * Integration tests for the file-system half of MongoService against an
 * ephemeral MongoDB container. Deliberately does not import puck-web — the
 * CRUD layer has no dependency on it.
 */

describe("MongoService file system (integration)", () => {
  let container: StartedMongoDBContainer;
  let service: MongoService;

  beforeAll(async () => {
    container = await new MongoDBContainer("mongo:7").start();
    const host = container.getHost();
    const port = container.getMappedPort(27017);
    const url = `mongodb://${host}:${port}/?directConnection=true`;
    service = new MongoService(url, "pfadimh_fs_test");
    await ensureFileSystemIndexes(service);
    await service.ensureSystemFolder();
    await service.ensureSystemAlbum();
  }, 120_000);

  afterAll(async () => {
    await service?.disconnect();
    await container?.stop();
  });

  describe("seeding", () => {
    it("creates exactly one system folder and one system album", async () => {
      // Calling twice should be idempotent.
      await service.ensureSystemFolder();
      await service.ensureSystemAlbum();

      const folders = await service.getFolderTree();
      const systemFolders = folders.filter((f) => f.isSystemFolder);
      expect(systemFolders).toHaveLength(1);
      expect(systemFolders[0]!.name).toBe("CMS Uploads");

      const collections = await service.getCollectionTree();
      const systemAlbums = collections.filter((c) => c.isSystemAlbum);
      expect(systemAlbums).toHaveLength(1);
      expect(systemAlbums[0]!.title).toBe("CMS Uploads");
    });
  });

  describe("folders", () => {
    it("creates a hierarchy up to level 2 and rejects level 3", async () => {
      const a = await service.createFolder({ name: "A", parentId: null });
      const b = await service.createFolder({ name: "B", parentId: a.id });
      const c = await service.createFolder({ name: "C", parentId: b.id });
      expect(a.level).toBe(0);
      expect(b.level).toBe(1);
      expect(c.level).toBe(2);
      await expect(
        service.createFolder({ name: "D", parentId: c.id })
      ).rejects.toThrow(/nesting limit/i);
    });

    it("refuses to delete a non-empty folder", async () => {
      const root = await service.createFolder({
        name: "NonEmptyRoot",
        parentId: null,
      });
      await service.createFolder({ name: "Child", parentId: root.id });
      await expect(service.deleteFolder(root.id)).rejects.toThrow(
        /not empty/i
      );
    });

    it("refuses to delete the system folder", async () => {
      const folders = await service.getFolderTree();
      const system = folders.find((f) => f.isSystemFolder)!;
      await expect(service.deleteFolder(system.id)).rejects.toThrow();
    });
  });

  describe("documents pool files", () => {
    it("creates a file bound to a folder and lists it", async () => {
      const folder = await service.createFolder({
        name: "DocsA",
        parentId: null,
      });
      const file = await service.createFile({
        uuid: "uuid-doc-1",
        kind: "document",
        originalFilename: "handbook.pdf",
        altText: null,
        mimeType: "application/pdf",
        sizeBytes: 1024,
        s3Key: "uuid-doc-1.pdf",
        thumbSmKey: null,
        thumbMdKey: null,
        width: null,
        height: null,
        blurhash: null,
        pool: { kind: "documents", folderId: folder.id },
      });
      expect(file.folderId).toBe(folder.id);

      const listed = await service.listFolderFiles(folder.id, {
        offset: 0,
        limit: 50,
      });
      expect(listed.map((f) => f.id)).toContain(file.id);
    });

    it("moves files between folders", async () => {
      const src = await service.createFolder({
        name: "Src",
        parentId: null,
      });
      const dst = await service.createFolder({
        name: "Dst",
        parentId: null,
      });
      const file = await service.createFile({
        uuid: "uuid-doc-mv",
        kind: "document",
        originalFilename: "movable.pdf",
        altText: null,
        mimeType: "application/pdf",
        sizeBytes: 1,
        s3Key: "uuid-doc-mv.pdf",
        thumbSmKey: null,
        thumbMdKey: null,
        width: null,
        height: null,
        blurhash: null,
        pool: { kind: "documents", folderId: src.id },
      });
      await service.moveFilesToFolder([file.id], dst.id);
      const after = await service.getFile(file.id);
      expect(after?.folderId).toBe(dst.id);
    });
  });

  describe("media pool files and album membership", () => {
    it("creates an album in a collection and adds files", async () => {
      const albumCollection = await service.createCollection({
        type: "album_collection",
        title: "Sommerlager 2024",
        parentId: null,
      });
      const day1 = await service.createCollection({
        type: "album",
        title: "Day 1",
        parentId: albumCollection.id,
      });
      const day2 = await service.createCollection({
        type: "album",
        title: "Day 2",
        parentId: albumCollection.id,
      });

      const file = await service.createFile({
        uuid: "uuid-media-1",
        kind: "image",
        originalFilename: "photo.jpg",
        altText: null,
        mimeType: "image/jpeg",
        sizeBytes: 2048,
        s3Key: "uuid-media-1.jpg",
        thumbSmKey: "uuid-media-1_thumb_sm.webp",
        thumbMdKey: "uuid-media-1_thumb_md.webp",
        width: 4000,
        height: 3000,
        blurhash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
        pool: { kind: "media", albumId: day1.id },
      });
      expect(file.folderId).toBeNull();

      const listedDay1 = await service.listCollectionFiles(day1.id, {
        offset: 0,
        limit: 50,
      });
      expect(listedDay1.map((f) => f.id)).toContain(file.id);

      // Multi-album membership.
      await service.addFilesToAlbum([file.id], day2.id);
      const listedDay2 = await service.listCollectionFiles(day2.id, {
        offset: 0,
        limit: 50,
      });
      expect(listedDay2.map((f) => f.id)).toContain(file.id);

      // Idempotent — second add is a no-op.
      await service.addFilesToAlbum([file.id], day2.id);
      const dayTwoAgain = await service.listCollectionFiles(day2.id, {
        offset: 0,
        limit: 50,
      });
      expect(
        dayTwoAgain.filter((f) => f.id === file.id).length
      ).toBe(1);

      // Remove from day2 — should succeed (still in day1).
      const firstRemove = await service.removeFilesFromAlbum(
        [file.id],
        day2.id
      );
      expect(firstRemove.removed).toEqual([file.id]);

      // Remove from day1 — should be blocked (last album).
      const secondRemove = await service.removeFilesFromAlbum(
        [file.id],
        day1.id
      );
      expect(secondRemove.blocked).toEqual([file.id]);
      expect(secondRemove.removed).toEqual([]);
    });

    it("refuses to create a top-level album (non-system)", async () => {
      await expect(
        service.createCollection({
          type: "album",
          title: "stray",
          parentId: null,
        })
      ).rejects.toThrow();
    });
  });

  describe("reference scanning", () => {
    it("finds a fileId embedded in puck-data", async () => {
      const fileId = "aabbccddeeff112233445566"; // 24 hex chars
      await service.savePage(
        "/test-ref",
        asData({
          root: { props: { title: "t" } },
          content: [
            {
              type: "Hero",
              props: { id: "hero-1", backgroundImage: fileId, title: "hi" },
            },
          ],
        })
      );
      const refs = await service.findFileReferencesInPuckData(fileId);
      expect(refs.length).toBeGreaterThanOrEqual(1);
      expect(refs[0]!.pageId).toBe("/test-ref");
      expect(refs[0]!.propPath).toBe("backgroundImage");
      await service.deletePage("/test-ref");
    });

    it("returns empty when the id is not referenced", async () => {
      const refs = await service.findFileReferencesInPuckData(
        "aabbccddeeff112233445566"
      );
      expect(refs).toEqual([]);
    });
  });

  describe("orphan GC", () => {
    it("returns a Media file with zero album memberships as an orphan", async () => {
      // Create an album, drop a file in, then manually clear its membership.
      const ac = await service.createCollection({
        type: "album_collection",
        title: "GC Test Collection",
        parentId: null,
      });
      const album = await service.createCollection({
        type: "album",
        title: "GC Album",
        parentId: ac.id,
      });
      const file = await service.createFile({
        uuid: "uuid-orphan-1",
        kind: "image",
        originalFilename: "orphan.jpg",
        altText: null,
        mimeType: "image/jpeg",
        sizeBytes: 1,
        s3Key: "uuid-orphan-1.jpg",
        thumbSmKey: null,
        thumbMdKey: null,
        width: null,
        height: null,
        blurhash: null,
        pool: { kind: "media", albumId: album.id },
      });
      // Bypass the API-layer safety and remove the only membership
      // directly — `removeFilesFromAlbum` blocks last-album removals by
      // design, so we cannot reach the orphan state through the service.
      await service
        .rawDb()
        .collection("collection_files")
        .deleteMany({ fileId: new ObjectId(file.id) });
      const refreshed = await service.findOrphanFiles();
      expect(refreshed.map((f) => f.id)).toContain(file.id);
    });
  });

  describe("delete with references", () => {
    it("blocks delete when the file is referenced", async () => {
      const folder = await service.createFolder({
        name: "RefDocs",
        parentId: null,
      });
      const file = await service.createFile({
        uuid: "uuid-doc-ref",
        kind: "document",
        originalFilename: "ref.pdf",
        altText: null,
        mimeType: "application/pdf",
        sizeBytes: 1,
        s3Key: "uuid-doc-ref.pdf",
        thumbSmKey: null,
        thumbMdKey: null,
        width: null,
        height: null,
        blurhash: null,
        pool: { kind: "documents", folderId: folder.id },
      });
      await service.savePage(
        "/has-ref",
        asData({
          root: { props: { title: "t" } },
          content: [
            {
              type: "DocLink",
              props: { id: "dl-1", doc: file.id },
            },
          ],
        })
      );
      const result = await service.deleteFile(file.id);
      expect(result.status).toBe("blocked");
      await service.deletePage("/has-ref");
      const result2 = await service.deleteFile(file.id);
      expect(result2.status).toBe("deleted");
    });
  });
});

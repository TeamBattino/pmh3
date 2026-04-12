import {
  MongoDBContainer,
  type StartedMongoDBContainer,
} from "@testcontainers/mongodb";
import type { Data } from "@measured/puck";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureFileSystemIndexes } from "@/lib/db/db-bootstrap";
import { MongoService } from "@/lib/db/db-mongo-impl";
import type { FolderRecord } from "@/lib/db/file-system-types";

/**
 * Integration tests for the documents-section work added in Phase 2/3:
 *
 *   - `cascadeDeleteFolder` / `previewCascadeDeleteFolder` — subtree walk,
 *     counts, hard-block on puck-data references, atomic delete, s3 key
 *     collection.
 *   - `updateFolder({ parentId })` — depth cap, subtree move, descendant
 *     ancestry recomputation, self/descendant rejection.
 *
 * Runs against a fresh MongoDB container. Mirrors the pattern used by
 * `file-system.test.ts` so the container cost is amortised within the
 * `admin/integration` project.
 */

const asData = (d: unknown): Data => d as Data;

/**
 * Build a minimal documents-pool file. Every field is filled with a
 * harmless constant — tests that care about a specific field override it.
 */
function docFile(uuid: string, folderId: string, filename = `${uuid}.pdf`) {
  return {
    uuid,
    kind: "document" as const,
    originalFilename: filename,
    altText: null,
    mimeType: "application/pdf",
    sizeBytes: 1,
    s3Key: `${uuid}.pdf`,
    thumbSmKey: null,
    thumbMdKey: null,
    width: null,
    height: null,
    blurhash: null,
    pool: { kind: "documents" as const, folderId },
  };
}

describe("Documents section (integration)", () => {
  let container: StartedMongoDBContainer;
  let service: MongoService;

  beforeAll(async () => {
    container = await new MongoDBContainer("mongo:7").start();
    const host = container.getHost();
    const port = container.getMappedPort(27017);
    const url = `mongodb://${host}:${port}/?directConnection=true`;
    service = new MongoService(url, "pfadimh_documents_test");
    await ensureFileSystemIndexes(service);
    await service.ensureSystemFolder();
  }, 120_000);

  afterAll(async () => {
    await service?.disconnect();
    await container?.stop();
  });

  // ── slug format (regression) ─────────────────────────────────────────

  describe("folder slugs (regression)", () => {
    it("stores slugs as clean URL segments with no parentId prefix", async () => {
      const root = await service.createFolder({
        name: "Slug Root",
        parentId: null,
      });
      expect(root.slug).toBe("slug-root");
      // Important: a colon in the slug would break the catch-all
      // `/documents/[[...path]]` route, since Next decodes path segments
      // but colons have special meaning in URLs.
      expect(root.slug).not.toMatch(/:/);

      const child = await service.createFolder({
        name: "Slug Child",
        parentId: root.id,
      });
      expect(child.slug).toBe("slug-child");
      expect(child.slug).not.toMatch(/:/);
    });

    it("allows the same slug under different parents", async () => {
      const a = await service.createFolder({
        name: "PA",
        parentId: null,
      });
      const b = await service.createFolder({
        name: "PB",
        parentId: null,
      });
      const ca = await service.createFolder({
        name: "Notes",
        parentId: a.id,
      });
      const cb = await service.createFolder({
        name: "Notes",
        parentId: b.id,
      });
      expect(ca.slug).toBe("notes");
      expect(cb.slug).toBe("notes");
      expect(ca.id).not.toBe(cb.id);
    });

    it("disambiguates duplicate slugs under the same parent with -N suffix", async () => {
      const parent = await service.createFolder({
        name: "DupParent",
        parentId: null,
      });
      const first = await service.createFolder({
        name: "Dup",
        parentId: parent.id,
      });
      const second = await service.createFolder({
        name: "Dup",
        parentId: parent.id,
      });
      expect(first.slug).toBe("dup");
      expect(second.slug).toBe("dup-2");
    });
  });

  // ── cascadeDeleteFolder ──────────────────────────────────────────────

  describe("cascadeDeleteFolder", () => {
    it("deletes an empty folder", async () => {
      const folder = await service.createFolder({
        name: "EmptyCascade",
        parentId: null,
      });
      const result = await service.cascadeDeleteFolder(folder.id);
      expect(result.blocked).toEqual([]);
      expect(result.deletedFolderIds).toEqual([folder.id]);
      expect(result.deletedFileIds).toEqual([]);
      expect(result.s3Keys).toEqual([]);

      const tree = await service.getFolderTree();
      expect(tree.map((f) => f.id)).not.toContain(folder.id);
    });

    it("recursively deletes a folder with subfolders and files", async () => {
      const root = await service.createFolder({
        name: "CascadeRoot",
        parentId: null,
      });
      const sub = await service.createFolder({
        name: "CascadeSub",
        parentId: root.id,
      });
      const leaf = await service.createFolder({
        name: "CascadeLeaf",
        parentId: sub.id,
      });

      const f1 = await service.createFile(docFile("cascade-1", root.id));
      const f2 = await service.createFile(docFile("cascade-2", sub.id));
      const f3 = await service.createFile(docFile("cascade-3", leaf.id));

      const preview = await service.previewCascadeDeleteFolder(root.id);
      expect(preview.fileCount).toBe(3);
      expect(preview.subfolderCount).toBe(2);
      expect(preview.blockedFiles).toEqual([]);

      const result = await service.cascadeDeleteFolder(root.id);
      expect(result.blocked).toEqual([]);
      expect(result.deletedFileIds).toHaveLength(3);
      expect(new Set(result.deletedFileIds)).toEqual(
        new Set([f1.id, f2.id, f3.id])
      );
      expect(new Set(result.deletedFolderIds)).toEqual(
        new Set([root.id, sub.id, leaf.id])
      );
      // Each file had only an `original` s3 key — no thumbs.
      expect(result.s3Keys.sort()).toEqual(
        [f1.s3Key, f2.s3Key, f3.s3Key].sort()
      );

      const tree = await service.getFolderTree();
      const treeIds = new Set(tree.map((f) => f.id));
      expect(treeIds.has(root.id)).toBe(false);
      expect(treeIds.has(sub.id)).toBe(false);
      expect(treeIds.has(leaf.id)).toBe(false);

      // Files are gone too.
      expect(await service.getFile(f1.id)).toBeNull();
      expect(await service.getFile(f2.id)).toBeNull();
      expect(await service.getFile(f3.id)).toBeNull();
    });

    it("hard-blocks when any file in the subtree is referenced in puck-data", async () => {
      const root = await service.createFolder({
        name: "BlockedRoot",
        parentId: null,
      });
      const sub = await service.createFolder({
        name: "BlockedSub",
        parentId: root.id,
      });
      const safe = await service.createFile(docFile("blocked-safe", root.id));
      const referenced = await service.createFile(
        docFile("blocked-ref", sub.id)
      );

      // Reference the nested file so the whole cascade must abort.
      await service.savePage(
        "/documents-test-blocked",
        asData({
          root: { props: { title: "t" } },
          content: [
            {
              type: "DocLink",
              props: { id: "dl-1", doc: referenced.id },
            },
          ],
          zones: {},
        })
      );

      const preview = await service.previewCascadeDeleteFolder(root.id);
      expect(preview.fileCount).toBe(2);
      expect(preview.subfolderCount).toBe(1);
      expect(preview.blockedFiles).toHaveLength(1);
      expect(preview.blockedFiles[0]!.fileId).toBe(referenced.id);
      expect(preview.blockedFiles[0]!.filename).toBe("blocked-ref.pdf");
      expect(preview.blockedFiles[0]!.references[0]!.pageId).toBe(
        "/documents-test-blocked"
      );

      const result = await service.cascadeDeleteFolder(root.id);
      expect(result.blocked).toHaveLength(1);
      expect(result.blocked[0]!.fileId).toBe(referenced.id);
      // CRITICAL: nothing was deleted — not even the safe file or the
      // empty subfolder. Atomicity is the whole point of the hard-block.
      expect(result.deletedFileIds).toEqual([]);
      expect(result.deletedFolderIds).toEqual([]);
      expect(result.s3Keys).toEqual([]);

      expect(await service.getFile(safe.id)).not.toBeNull();
      expect(await service.getFile(referenced.id)).not.toBeNull();
      const tree = await service.getFolderTree();
      const treeIds = new Set(tree.map((f) => f.id));
      expect(treeIds.has(root.id)).toBe(true);
      expect(treeIds.has(sub.id)).toBe(true);

      // After removing the reference, cascade succeeds.
      await service.deletePage("/documents-test-blocked");
      const retry = await service.cascadeDeleteFolder(root.id);
      expect(retry.blocked).toEqual([]);
      expect(new Set(retry.deletedFileIds)).toEqual(
        new Set([safe.id, referenced.id])
      );
    });

    it("rejects cascading the system folder", async () => {
      const tree = await service.getFolderTree();
      const system = tree.find((f) => f.isSystemFolder)!;
      await expect(
        service.cascadeDeleteFolder(system.id)
      ).rejects.toThrow(/system/i);
    });

    it("collects all s3 key variants (original + thumbs) for deleted files", async () => {
      const folder = await service.createFolder({
        name: "ThumbsRoot",
        parentId: null,
      });
      const file = await service.createFile({
        uuid: "cascade-thumbs",
        kind: "image",
        originalFilename: "thumbs.jpg",
        altText: null,
        mimeType: "image/jpeg",
        sizeBytes: 2048,
        s3Key: "cascade-thumbs.jpg",
        thumbSmKey: "cascade-thumbs_sm.webp",
        thumbMdKey: "cascade-thumbs_md.webp",
        width: 100,
        height: 100,
        blurhash: null,
        pool: { kind: "documents", folderId: folder.id },
      });

      const result = await service.cascadeDeleteFolder(folder.id);
      expect(result.deletedFileIds).toEqual([file.id]);
      expect(result.s3Keys.sort()).toEqual(
        [
          "cascade-thumbs.jpg",
          "cascade-thumbs_sm.webp",
          "cascade-thumbs_md.webp",
        ].sort()
      );
    });
  });

  // ── updateFolder({ parentId }) ───────────────────────────────────────

  describe("updateFolder: reparenting", () => {
    async function makeTree(prefix: string) {
      const a = await service.createFolder({
        name: `${prefix}-A`,
        parentId: null,
      });
      const b = await service.createFolder({
        name: `${prefix}-B`,
        parentId: a.id,
      });
      const c = await service.createFolder({
        name: `${prefix}-C`,
        parentId: b.id,
      });
      return { a, b, c };
    }

    async function refreshed(folderId: string): Promise<FolderRecord> {
      const tree = await service.getFolderTree();
      const found = tree.find((f) => f.id === folderId);
      if (!found) throw new Error(`folder ${folderId} not found`);
      return found;
    }

    it("moves a folder to root (parentId: null) and recomputes level + ancestors", async () => {
      const { a, b } = await makeTree("move-to-root");
      // B sits at level 1 under A. Move it to root.
      await service.updateFolder(b.id, { parentId: null });
      const bAfter = await refreshed(b.id);
      expect(bAfter.level).toBe(0);
      expect(bAfter.parentId).toBeNull();
      expect(bAfter.ancestorIds).toEqual([]);
      // A is unchanged.
      const aAfter = await refreshed(a.id);
      expect(aAfter.level).toBe(0);
    });

    it("moves a subtree and recomputes descendants' levels + ancestors", async () => {
      const src = await service.createFolder({
        name: "subtree-src",
        parentId: null,
      });
      const mid = await service.createFolder({
        name: "subtree-mid",
        parentId: src.id,
      });
      // src(0) → mid(1). Move mid under a new root so its level stays 1
      // (new parent is root) — descendants (none here) would follow.
      const other = await service.createFolder({
        name: "subtree-other",
        parentId: null,
      });
      await service.updateFolder(mid.id, { parentId: other.id });
      const midAfter = await refreshed(mid.id);
      expect(midAfter.level).toBe(1);
      expect(midAfter.parentId).toBe(other.id);
      expect(midAfter.ancestorIds).toEqual([other.id]);
    });

    it("rewrites grandchildren ancestry when a mid-level folder is moved", async () => {
      // Build A0 → B1 → C2, and a fresh root to move B under.
      const { a, b, c } = await makeTree("mvgrand");
      const newRoot = await service.createFolder({
        name: "mvgrand-new-root",
        parentId: null,
      });
      // Move B under newRoot. B should stay at level 1, C should stay at
      // level 2 but its ancestorIds should now be [newRoot, B] instead of
      // [A, B].
      await service.updateFolder(b.id, { parentId: newRoot.id });
      const bAfter = await refreshed(b.id);
      const cAfter = await refreshed(c.id);
      expect(bAfter.level).toBe(1);
      expect(bAfter.ancestorIds).toEqual([newRoot.id]);
      expect(cAfter.level).toBe(2);
      expect(cAfter.ancestorIds).toEqual([newRoot.id, b.id]);
      // A is untouched.
      const aAfter = await refreshed(a.id);
      expect(aAfter.level).toBe(0);
      expect(aAfter.ancestorIds).toEqual([]);
    });

    it("rejects moving a folder into itself", async () => {
      const a = await service.createFolder({
        name: "self-move",
        parentId: null,
      });
      await expect(
        service.updateFolder(a.id, { parentId: a.id })
      ).rejects.toThrow();
    });

    it("rejects moving a folder into its own descendant", async () => {
      const { a, b } = await makeTree("desc-move");
      await expect(
        service.updateFolder(a.id, { parentId: b.id })
      ).rejects.toThrow(/descendant/i);
    });

    it("rejects a move that would push the subtree past the depth cap", async () => {
      // src is a level-0 folder with a depth-1 subtree. Moving it under
      // another level-1 folder would push its descendants to level 3,
      // exceeding MAX_FOLDER_LEVEL=2.
      const src = await service.createFolder({
        name: "cap-src",
        parentId: null,
      });
      await service.createFolder({
        name: "cap-child",
        parentId: src.id,
      });

      const host = await service.createFolder({
        name: "cap-host",
        parentId: null,
      });
      const hostChild = await service.createFolder({
        name: "cap-host-child",
        parentId: host.id,
      });

      // src.level (0) → moving under hostChild (level 1) puts src at level
      // 2 and src's child at level 3. Should reject.
      await expect(
        service.updateFolder(src.id, { parentId: hostChild.id })
      ).rejects.toThrow(/nesting|limit|depth/i);
    });

    it("allows a move that lands exactly at the depth cap", async () => {
      const src = await service.createFolder({
        name: "edge-src",
        parentId: null,
      });
      // No children — subtree height is 0.
      const host = await service.createFolder({
        name: "edge-host",
        parentId: null,
      });
      const hostChild = await service.createFolder({
        name: "edge-host-child",
        parentId: host.id,
      });
      // src moves to level 2 — exactly the cap. Should succeed.
      await service.updateFolder(src.id, { parentId: hostChild.id });
      const srcAfter = await refreshed(src.id);
      expect(srcAfter.level).toBe(2);
      expect(srcAfter.ancestorIds).toEqual([host.id, hostChild.id]);
    });

    it("refuses to modify the system folder's parent", async () => {
      const tree = await service.getFolderTree();
      const system = tree.find((f) => f.isSystemFolder)!;
      await expect(
        service.updateFolder(system.id, { parentId: null })
      ).rejects.toThrow(/system/i);
    });
  });
});

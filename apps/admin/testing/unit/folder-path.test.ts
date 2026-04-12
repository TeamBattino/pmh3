import { describe, expect, it } from "vitest";
import {
  buildBreadcrumbChain,
  buildSlugPath,
  hrefForFolder,
  resolveSlugPath,
} from "@/lib/files/folder-path";
import type { FolderRecord } from "@/lib/db/file-system-types";

/**
 * Unit tests for the pure slug-path helpers that power the
 * `/documents/[[...path]]` catch-all route and the breadcrumb. No Mongo
 * needed — these are plain array walks.
 */

function folder(
  id: string,
  name: string,
  slug: string,
  parentId: string | null,
  ancestorIds: string[] = [],
  level = ancestorIds.length
): FolderRecord {
  return {
    id,
    name,
    slug,
    parentId,
    ancestorIds,
    level,
    sortOrder: 0,
    isSystemFolder: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
  };
}

/**
 * Build a small fixture that mirrors the real data shape:
 *
 *   cms-uploads (root)
 *     └─ events
 *         └─ 2025
 *   programs (root)
 */
function fixture(): FolderRecord[] {
  const cms = folder("f1", "CMS Uploads", "cms-uploads", null, [], 0);
  const events = folder("f2", "Events", "events", "f1", ["f1"], 1);
  const year = folder("f3", "2025", "2025", "f2", ["f1", "f2"], 2);
  const programs = folder("f4", "Programs", "programs", null, [], 0);
  return [cms, events, year, programs];
}

describe("buildSlugPath", () => {
  it("returns the full slug chain from root to self", () => {
    const folders = fixture();
    expect(buildSlugPath("f3", folders)).toEqual([
      "cms-uploads",
      "events",
      "2025",
    ]);
  });

  it("returns a single segment for a top-level folder", () => {
    const folders = fixture();
    expect(buildSlugPath("f1", folders)).toEqual(["cms-uploads"]);
  });

  it("returns an empty array for an unknown folder id", () => {
    expect(buildSlugPath("missing", fixture())).toEqual([]);
  });
});

describe("resolveSlugPath", () => {
  it("resolves a full path to the target folder", () => {
    const folders = fixture();
    const resolved = resolveSlugPath(
      ["cms-uploads", "events", "2025"],
      folders
    );
    expect(resolved?.id).toBe("f3");
  });

  it("resolves a single-segment path to a root folder", () => {
    const folders = fixture();
    expect(resolveSlugPath(["cms-uploads"], folders)?.id).toBe("f1");
    expect(resolveSlugPath(["programs"], folders)?.id).toBe("f4");
  });

  it("returns null when a segment does not match", () => {
    const folders = fixture();
    expect(resolveSlugPath(["cms-uploads", "nonexistent"], folders)).toBeNull();
  });

  it("returns null when the first segment does not exist at root level", () => {
    const folders = fixture();
    // "events" exists, but only under cms-uploads. At root it's invalid.
    expect(resolveSlugPath(["events"], folders)).toBeNull();
  });

  it("returns null for an empty path (Home is a special case handled by the caller)", () => {
    expect(resolveSlugPath([], fixture())).toBeNull();
  });

  it("does not confuse slugs of the same name under different parents", () => {
    // Two sibling roots each with a child named "notes".
    const r1 = folder("r1", "Root One", "root-one", null, [], 0);
    const r2 = folder("r2", "Root Two", "root-two", null, [], 0);
    const n1 = folder("n1", "Notes", "notes", "r1", ["r1"], 1);
    const n2 = folder("n2", "Notes", "notes", "r2", ["r2"], 1);
    const folders = [r1, r2, n1, n2];

    expect(resolveSlugPath(["root-one", "notes"], folders)?.id).toBe("n1");
    expect(resolveSlugPath(["root-two", "notes"], folders)?.id).toBe("n2");
  });
});

describe("buildBreadcrumbChain", () => {
  it("returns cumulative hrefs for each segment", () => {
    const folders = fixture();
    const chain = buildBreadcrumbChain("f3", folders);
    expect(chain).toHaveLength(3);
    expect(chain[0]!.folder.id).toBe("f1");
    expect(chain[0]!.href).toBe("/documents/cms-uploads");
    expect(chain[1]!.folder.id).toBe("f2");
    expect(chain[1]!.href).toBe("/documents/cms-uploads/events");
    expect(chain[2]!.folder.id).toBe("f3");
    expect(chain[2]!.href).toBe("/documents/cms-uploads/events/2025");
  });

  it("returns a single entry for a root folder", () => {
    const folders = fixture();
    const chain = buildBreadcrumbChain("f4", folders);
    expect(chain).toHaveLength(1);
    expect(chain[0]!.href).toBe("/documents/programs");
  });

  it("returns empty for an unknown id", () => {
    expect(buildBreadcrumbChain("missing", fixture())).toEqual([]);
  });
});

describe("hrefForFolder", () => {
  it("returns /documents for null (Home)", () => {
    expect(hrefForFolder(null, fixture())).toBe("/documents");
  });

  it("returns the full slug path for a nested folder", () => {
    expect(hrefForFolder("f3", fixture())).toBe(
      "/documents/cms-uploads/events/2025"
    );
  });

  it("falls back to /documents for an unknown id", () => {
    expect(hrefForFolder("missing", fixture())).toBe("/documents");
  });
});

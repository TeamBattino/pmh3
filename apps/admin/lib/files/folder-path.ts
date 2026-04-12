import type { FolderRecord } from "@/lib/db/file-system-types";

/**
 * Pure helpers that translate between folder IDs and the slug-chain URL used
 * by `/documents/[[...path]]`. Kept in a single file so the catch-all route,
 * the breadcrumb, and the tree navigator all agree on the encoding.
 *
 * Slugs are unique per parent (enforced by `createFolder`), which is what
 * lets `resolveSlugPath` walk the tree one level at a time without needing a
 * full-path index.
 */

/**
 * Walk the ancestor chain for `folderId` and return the slug segments from
 * root to self. Returns an empty array if the folder is not in the list.
 */
export function buildSlugPath(
  folderId: string,
  folders: FolderRecord[]
): string[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const current = byId.get(folderId);
  if (!current) return [];
  const segments: string[] = [];
  for (const ancestorId of current.ancestorIds) {
    const ancestor = byId.get(ancestorId);
    if (ancestor) segments.push(ancestor.slug);
  }
  segments.push(current.slug);
  return segments;
}

/**
 * Resolve a slug chain against the tree. Returns `null` if any segment is
 * missing — callers should `notFound()` in that case.
 */
export function resolveSlugPath(
  slugs: string[],
  folders: FolderRecord[]
): FolderRecord | null {
  if (slugs.length === 0) return null;
  const byParent = new Map<string | null, FolderRecord[]>();
  for (const f of folders) {
    const key = f.parentId;
    const bucket = byParent.get(key);
    if (bucket) bucket.push(f);
    else byParent.set(key, [f]);
  }
  let parentId: string | null = null;
  let current: FolderRecord | null = null;
  for (const slug of slugs) {
    const siblings: FolderRecord[] = byParent.get(parentId) ?? [];
    const match: FolderRecord | undefined = siblings.find(
      (f) => f.slug === slug
    );
    if (!match) return null;
    current = match;
    parentId = match.id;
  }
  return current;
}

/**
 * Given a folder, build `[{ folder, href }]` entries for each breadcrumb
 * segment, in root-to-self order. `href` is the cumulative slug path as a
 * route under `/documents`.
 */
export function buildBreadcrumbChain(
  folderId: string,
  folders: FolderRecord[]
): Array<{ folder: FolderRecord; href: string }> {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const current = byId.get(folderId);
  if (!current) return [];
  const chain: FolderRecord[] = [];
  for (const ancestorId of current.ancestorIds) {
    const ancestor = byId.get(ancestorId);
    if (ancestor) chain.push(ancestor);
  }
  chain.push(current);

  const out: Array<{ folder: FolderRecord; href: string }> = [];
  const slugs: string[] = [];
  for (const folder of chain) {
    slugs.push(folder.slug);
    out.push({ folder, href: `/documents/${slugs.join("/")}` });
  }
  return out;
}

/**
 * Convenience: the URL for a given folder id (or `/documents` for Home).
 */
export function hrefForFolder(
  folderId: string | null,
  folders: FolderRecord[]
): string {
  if (folderId === null) return "/documents";
  const slugs = buildSlugPath(folderId, folders);
  if (slugs.length === 0) return "/documents";
  return `/documents/${slugs.join("/")}`;
}

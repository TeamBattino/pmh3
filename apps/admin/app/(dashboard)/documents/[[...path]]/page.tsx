import { notFound } from "next/navigation";
import { DocumentsPage } from "@/components/documents/DocumentsPage";
import { getFolderTree } from "@/lib/db/file-system-actions";
import { resolveSlugPath } from "@/lib/files/folder-path";
import { requireServerPermission } from "@/lib/security/server-guard";

/**
 * Catch-all route for Documents. `/documents` is Home (folderId = null),
 * `/documents/a/b/c` drills down the tree by slug. The folder list is
 * fetched server-side and handed to `DocumentsPage` as `initialFolders` so
 * React Query hydrates without a second round-trip on first paint.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  await requireServerPermission({ all: ["asset:read"] });
  const { path = [] } = await params;
  const folders = await getFolderTree();

  if (path.length === 0) {
    return <DocumentsPage folderId={null} initialFolders={folders} />;
  }

  const resolved = resolveSlugPath(path, folders);
  if (!resolved) notFound();

  return <DocumentsPage folderId={resolved.id} initialFolders={folders} />;
}

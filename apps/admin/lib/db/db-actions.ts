"use server";

import { FooterData } from "@pfadipuck/puck-web/config/footer.config";
import { NavbarData } from "@pfadipuck/puck-web/config/navbar.config";
import {
  defaultPageData,
  PageData,
} from "@pfadipuck/puck-web/config/page.config";
import { SecurityConfig } from "@/lib/security/security-config";
import { requireServerPermission } from "@/lib/security/server-guard";
import { SYSTEM_ADMIN_CLIENT_ID } from "@/lib/db/system-clients";
import { getDbService, type AuthClient, type PageListItem } from "./db";

/**
 * Public Database Actions.
 * securely wraps internal service methods with permission checks.
 * Use this for all Client Components and Server Actions.
 */

export async function savePage(path: string, data: PageData) {
  await requireServerPermission({ any: ["page:create", "page:update"] });
  const db = await getDbService();
  return db.savePage(path, data);
}

export async function deletePage(path: string) {
  await requireServerPermission({ all: ["page:delete"] });
  const db = await getDbService();
  return db.deletePage(path);
}

export async function getPage(path: string): Promise<PageData | undefined> {
  const db = await getDbService();
  return db.getPage(path);
}

export async function saveNavbar(data: NavbarData) {
  await requireServerPermission({ all: ["navbar:update"] });
  const db = await getDbService();
  return db.saveNavbar(data);
}

export async function getNavbar(): Promise<NavbarData> {
  const db = await getDbService();
  return db.getNavbar();
}

export async function saveFooter(data: FooterData) {
  await requireServerPermission({ all: ["footer:update"] });
  const db = await getDbService();
  return db.saveFooter(data);
}

export async function getFooter(): Promise<FooterData> {
  const db = await getDbService();
  return db.getFooter();
}

export async function getAllPaths() {
  const db = await getDbService();
  return db.getAllPaths();
}

export async function getAllPages(): Promise<PageListItem[]> {
  const db = await getDbService();
  return db.getAllPages();
}

export async function createPage(
  path: string,
  title: string
): Promise<void> {
  await requireServerPermission({ any: ["page:create"] });
  const db = await getDbService();
  const data: PageData = {
    ...defaultPageData,
    root: { props: { title } },
  };
  await db.savePage(path, data);
}

export async function duplicatePage(
  sourcePath: string,
  newPath: string,
  newTitle: string
): Promise<void> {
  await requireServerPermission({ all: ["page:create"] });
  const db = await getDbService();
  const sourceData = await db.getPage(sourcePath);
  if (!sourceData) throw new Error("Source page not found");
  const cloned = structuredClone(sourceData);
  cloned.root = {
    ...cloned.root,
    props: { ...cloned.root.props, title: newTitle },
  };
  await db.savePage(newPath, cloned);
}

export async function getSecurityConfig() {
  await requireServerPermission({ all: ["role-permissions:read"] });
  const db = await getDbService();
  return db.getSecurityConfig();
}

export async function saveSecurityConfig(permissions: SecurityConfig) {
  await requireServerPermission({ all: ["role-permissions:update"] });
  const db = await getDbService();
  return db.saveSecurityConfig(permissions);
}

// ── OAuth clients ──────────────────────────────────────────────────

export async function getAuthClients(): Promise<AuthClient[]> {
  await requireServerPermission({ all: ["oauth-clients:manage"] });
  const db = await getDbService();
  return db.getAuthClients();
}

export async function getAuthClient(
  clientId: string
): Promise<AuthClient | null> {
  await requireServerPermission({ all: ["oauth-clients:manage"] });
  const db = await getDbService();
  return db.getAuthClient(clientId);
}

export async function saveAuthClient(
  client: AuthClient & { plainSecret?: string }
): Promise<void> {
  await requireServerPermission({ all: ["oauth-clients:manage"] });
  if (client.clientId === SYSTEM_ADMIN_CLIENT_ID) {
    throw new Error(
      "The admin OAuth client is managed via env vars on the auth service and cannot be edited here."
    );
  }
  const { plainSecret, ...rest } = client;
  if (plainSecret) {
    const { createHash } = await import("crypto");
    rest.clientSecretHash = createHash("sha256")
      .update(plainSecret)
      .digest("hex");
  }
  const db = await getDbService();
  return db.saveAuthClient(rest);
}

export async function deleteAuthClient(clientId: string): Promise<void> {
  await requireServerPermission({ all: ["oauth-clients:manage"] });
  if (clientId === SYSTEM_ADMIN_CLIENT_ID) {
    throw new Error(
      "The admin OAuth client is managed via env vars on the auth service and cannot be deleted here."
    );
  }
  const db = await getDbService();
  return db.deleteAuthClient(clientId);
}

/**
 * Fetch just the clientId + name list (for the role modal's service
 * access checkboxes). Requires only role-permissions:read since it's
 * used within the role editor.
 */
export async function getAuthClientList(): Promise<
  Pick<AuthClient, "clientId" | "name">[]
> {
  await requireServerPermission({ all: ["role-permissions:read"] });
  const db = await getDbService();
  const clients = await db.getAuthClients();
  return clients.map((c) => ({ clientId: c.clientId, name: c.name }));
}

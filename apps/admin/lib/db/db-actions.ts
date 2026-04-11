"use server";

import { FooterData } from "@pfadipuck/puck-web/config/footer.config";
import { NavbarData } from "@pfadipuck/puck-web/config/navbar.config";
import { PageData } from "@pfadipuck/puck-web/config/page.config";
import { SecurityConfig } from "@/lib/security/security-config";
import { requireServerPermission } from "@/lib/security/server-guard";
import { getDbService } from "./db";

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

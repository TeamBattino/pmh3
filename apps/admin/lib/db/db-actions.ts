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
  return getDbService().savePage(path, data);
}

export async function deletePage(path: string) {
  await requireServerPermission({ all: ["page:delete"] });
  return getDbService().deletePage(path);
}

export async function getPage(path: string): Promise<PageData | undefined> {
  return getDbService().getPage(path);
}

export async function saveNavbar(data: NavbarData) {
  await requireServerPermission({ all: ["navbar:update"] });
  return getDbService().saveNavbar(data);
}

export async function getNavbar(): Promise<NavbarData> {
  return getDbService().getNavbar();
}

export async function saveFooter(data: FooterData) {
  await requireServerPermission({ all: ["footer:update"] });
  return getDbService().saveFooter(data);
}

export async function getFooter(): Promise<FooterData> {
  return getDbService().getFooter();
}

export async function getAllPaths() {
  return getDbService().getAllPaths();
}

export async function getSecurityConfig() {
  await requireServerPermission({ all: ["role-permissions:read"] });
  return getDbService().getSecurityConfig();
}

export async function saveSecurityConfig(permissions: SecurityConfig) {
  await requireServerPermission({ all: ["role-permissions:update"] });
  return getDbService().saveSecurityConfig(permissions);
}

import type { FooterData } from "@pfadipuck/puck-web/config/footer.config";
import type { NavbarData } from "@pfadipuck/puck-web/config/navbar.config";
import type { PageData } from "@pfadipuck/puck-web/config/page.config";
import { env } from "@/lib/env";
import type { SecurityConfig } from "@/lib/security/security-config";
import type { Data } from "@measured/puck";
import { ensureSeeded } from "./db-bootstrap";
import { MongoService } from "./db-mongo-impl";

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

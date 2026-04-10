import type { FooterData } from "@pfadipuck/puck-web/config/footer.config";
import type { NavbarData } from "@pfadipuck/puck-web/config/navbar.config";
import type { PageData } from "@pfadipuck/puck-web/config/page.config";
import { env } from "@/lib/env";
import type { SecurityConfig } from "@/lib/security/security-config";
import type { Data } from "@measured/puck";
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

let _dbService: DatabaseService | undefined;

/**
 * Internal Database Service (lazy singleton).
 * DIRECT ACCESS - BYPASSES PERMISSION CHECKS.
 * Use only in trusted server contexts (e.g. API routes with their own auth).
 * For UI/Client access, use @lib/db/db-actions.ts instead.
 *
 * Lazy construction is important: this function must not run at module load
 * time, otherwise `next build` would try to connect to MongoDB during static
 * analysis of server modules. Callers should invoke it per-request.
 */
export function getDbService(): DatabaseService {
  if (!_dbService) {
    _dbService = new MongoService(
      env.MONGODB_CONNECTION_STRING,
      env.MONGODB_DB_NAME
    );
  }
  return _dbService;
}

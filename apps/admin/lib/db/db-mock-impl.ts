import { defaultFooterData } from "@pfadipuck/puck-web/config/footer.config";
import { defaultNavbarData } from "@pfadipuck/puck-web/config/navbar.config";
import { defaultSecurityConfig } from "@/lib/security/security-config";
import type { DatabaseService } from "./db";

export class MockDatabaseService implements DatabaseService {
  async savePage() {}
  async deletePage() {}
  async getPage() {
    return undefined;
  }
  async saveNavbar() {}
  async getNavbar() {
    return defaultNavbarData;
  }
  async saveFooter() {}
  async getFooter() {
    return defaultFooterData;
  }
  async getAllPaths() {
    return [];
  }
  async getSecurityConfig() {
    return defaultSecurityConfig;
  }
  async saveSecurityConfig() {}
}

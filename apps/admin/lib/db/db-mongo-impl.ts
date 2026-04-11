import type { FooterData } from "@pfadipuck/puck-web/config/footer.config";
import type { NavbarData } from "@pfadipuck/puck-web/config/navbar.config";
import type { PageData } from "@pfadipuck/puck-web/config/page.config";
import type { SecurityConfig } from "@/lib/security/security-config";
import type { Data } from "@measured/puck";
import { Db, MongoClient } from "mongodb";
import type { DatabaseService } from "./db";

/**
 * MongoDB implementation of DatabaseService — pure CRUD, no coupling to
 * application defaults. First-run seeding lives in `db-bootstrap.ts` and
 * is applied by the lazy getter in `db.ts`.
 */
export class MongoService implements DatabaseService {
  private client: MongoClient;
  private db: Db;
  readonly puckDataCollectionName = "puck-data";
  readonly securityCollectionName = "security";

  constructor(connectionString: string, dbName: string) {
    this.client = new MongoClient(connectionString);
    this.db = this.client.db(dbName);
  }

  /**
   * Raw DB handle, exposed so the bootstrap helper can idempotently create
   * collections and indexes without reaching through higher-level CRUD.
   */
  rawDb(): Db {
    return this.db;
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  async savePage(path: string, data: Data): Promise<void> {
    await this.db
      .collection(this.puckDataCollectionName)
      .updateOne(
        { type: "page", path: path },
        { $set: { data: data, type: "page", path: path } },
        { upsert: true }
      );
  }

  async deletePage(path: string): Promise<void> {
    await this.db
      .collection(this.puckDataCollectionName)
      .deleteOne({ type: "page", path: path });
  }

  async getPage(path: string): Promise<PageData | undefined> {
    const result = await this.db
      .collection(this.puckDataCollectionName)
      .findOne({ type: "page", path: path });
    return result ? result.data : undefined;
  }

  async saveNavbar(data: NavbarData): Promise<void> {
    await this.db
      .collection(this.puckDataCollectionName)
      .updateOne(
        { type: "navbar" },
        { $set: { data: data, type: "navbar" } },
        { upsert: true }
      );
  }

  async getNavbar(): Promise<NavbarData> {
    const result = await this.db
      .collection(this.puckDataCollectionName)
      .findOne({ type: "navbar" });
    if (!result) throw new Error("Navbar data not found");
    return result.data;
  }

  async saveFooter(data: FooterData): Promise<void> {
    await this.db
      .collection(this.puckDataCollectionName)
      .updateOne(
        { type: "footer" },
        { $set: { data: data, type: "footer" } },
        { upsert: true }
      );
  }

  async getFooter(): Promise<FooterData> {
    const result = await this.db
      .collection(this.puckDataCollectionName)
      .findOne({ type: "footer" });
    if (!result) throw new Error("Footer data not found");
    return result.data;
  }

  async getAllPaths(): Promise<string[]> {
    const pages = await this.db
      .collection(this.puckDataCollectionName)
      .find({ type: "page" })
      .toArray();
    return pages.map((page) => page.path);
  }

  async getSecurityConfig(): Promise<SecurityConfig> {
    const result = await this.db
      .collection(this.securityCollectionName)
      .findOne({ type: "securityConfig" });
    if (!result) throw new Error("Security config not found");
    return result.data;
  }

  async saveSecurityConfig(securityConfig: SecurityConfig): Promise<void> {
    await this.db
      .collection(this.securityCollectionName)
      .updateOne(
        { type: "securityConfig" },
        { $set: { data: securityConfig, type: "securityConfig" } },
        { upsert: true }
      );
  }
}

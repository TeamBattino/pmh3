import { defaultFooterData } from "@pfadipuck/puck-web/config/footer.config";
import { defaultNavbarData } from "@pfadipuck/puck-web/config/navbar.config";
import { defaultSecurityConfig } from "@/lib/security/security-config";
import type { MongoService } from "./db-mongo-impl";

/**
 * Idempotently seed a MongoService with the application's default navbar,
 * footer, and security config on first run. Extracted from MongoService so
 * the CRUD layer has zero coupling to puck-web's component graph —
 * importing those runtime values pulls in React and breaks the Node test
 * runner's worker IPC.
 */
export async function ensureSeeded(service: MongoService): Promise<void> {
  const db = service.rawDb();

  // Ensure pages collection + path index
  const existing = await db
    .listCollections({ name: service.puckDataCollectionName })
    .toArray();
  if (existing.length === 0) {
    await db.createCollection(service.puckDataCollectionName);
    await db.collection(service.puckDataCollectionName).createIndex({ path: 1 });
  }

  // Seed navbar if missing
  const navbar = await db
    .collection(service.puckDataCollectionName)
    .findOne({ type: "navbar" });
  if (!navbar) {
    console.log("Navbar data not found, creating with default data");
    await service.saveNavbar(defaultNavbarData);
  }

  // Seed footer if missing
  const footer = await db
    .collection(service.puckDataCollectionName)
    .findOne({ type: "footer" });
  if (!footer) {
    console.log("Footer data not found, creating with default data");
    await service.saveFooter(defaultFooterData);
  }

  // Seed security config if missing
  const security = await db
    .collection(service.securityCollectionName)
    .findOne({ type: "securityConfig" });
  if (!security) {
    console.log("Security config not found, creating with default data");
    await service.saveSecurityConfig(defaultSecurityConfig);
  }
}

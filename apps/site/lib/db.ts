import type { FooterData } from "@pfadipuck/puck-web/config/footer.config";
import type { NavbarData } from "@pfadipuck/puck-web/config/navbar.config";
import type { PageData } from "@pfadipuck/puck-web/config/page.config";
import { MongoClient } from "mongodb";

const globalForMongo = globalThis as unknown as { _mongoClient?: MongoClient };

function getClient() {
  if (!globalForMongo._mongoClient) {
    globalForMongo._mongoClient = new MongoClient(process.env.MONGODB_CONNECTION_STRING!);
  }
  return globalForMongo._mongoClient;
}

function getCollection() {
  const client = getClient();
  const db = client.db(process.env.MONGODB_DB_NAME!);
  return db.collection("puck-data");
}

export async function getPage(path: string): Promise<PageData | null> {
  const doc = await getCollection().findOne({ type: "page", path });
  return doc?.data as PageData | null ?? null;
}

export async function getNavbar(): Promise<NavbarData> {
  const doc = await getCollection().findOne({ type: "navbar" });
  return doc!.data as NavbarData;
}

export async function getFooter(): Promise<FooterData> {
  const doc = await getCollection().findOne({ type: "footer" });
  return doc!.data as FooterData;
}

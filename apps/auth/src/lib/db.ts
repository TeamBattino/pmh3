import { MongoClient, type Collection, type Db } from "mongodb";
import type {
  AuthClient,
  PendingAuthorization,
  SecurityConfig,
  StoredAccessToken,
  StoredAuthCode,
} from "../types";

let client: MongoClient;
let db: Db;

export async function initDb(
  connectionString: string,
  dbName: string
): Promise<void> {
  client = new MongoClient(connectionString);
  await client.connect();
  db = client.db(dbName);

  // TTL index on auth codes — expire after 5 minutes
  await db
    .collection("auth-codes")
    .createIndex({ createdAt: 1 }, { expireAfterSeconds: 300 });

  // TTL index on access tokens — expire after 1 hour
  await db
    .collection("auth-access-tokens")
    .createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 });

  // TTL index on pending authorizations — expire after 10 minutes
  await db
    .collection("auth-pending")
    .createIndex({ createdAt: 1 }, { expireAfterSeconds: 600 });

  // Unique index on client IDs
  await db
    .collection("auth-clients")
    .createIndex({ clientId: 1 }, { unique: true });

  // Seed default admin app client if it doesn't exist
  await seedDefaultClient();

  // Seed default security config if neither admin nor auth has created one yet
  await seedDefaultSecurityConfig();
}

async function seedDefaultClient(): Promise<void> {
  const existing = await authClientsCol().findOne({ clientId: "pfadimh-admin" });
  if (existing) return;

  const redirectUris = [
    "http://localhost:3001/auth/callback/oidc",
    // Docker compose network (e2e + containerized deployments)
    "http://admin:3001/auth/callback/oidc",
  ];

  // Production/staging: add callback for the real admin URL
  if (process.env.ADMIN_URL) {
    const base = process.env.ADMIN_URL.replace(/\/+$/, "");
    redirectUris.push(`${base}/auth/callback/oidc`);
  }

  console.log("Seeding default OAuth client: pfadimh-admin");
  await authClientsCol().insertOne({
    clientId: "pfadimh-admin",
    // SHA-256 of "dev-secret"
    clientSecretHash: "298754db2dbab6ec62605ceb0379eb7ee376580359449efe0caa3aa06cd56736",
    name: "PMH Admin",
    description: "CMS admin panel",
    redirectUris,
  });
}

async function seedDefaultSecurityConfig(): Promise<void> {
  const existing = await db
    .collection("security")
    .findOne({ type: "securityConfig" });
  if (existing) return;

  console.log("Seeding default security config");
  await db.collection("security").insertOne({
    type: "securityConfig",
    data: {
      roles: [
        {
          name: "Admin",
          description: "Admin role with all permissions",
          permissions: ["global-admin"],
          midataGroupMappings: [
            {
              groupId: 1172,
              roleClasses: [
                "Group::Abteilung::Abteilungsleitung",
                "Group::Abteilung::Webmaster",
              ],
            },
          ],
          allowedClients: ["pfadimh-admin"],
        },
        {
          name: "Leiter",
          description: "Leiter role with limited permissions",
          permissions: [
            "page:create",
            "page:update",
            "page:delete",
            "admin-ui:read",
            "navbar:update",
            "footer:update",
            "asset:create",
            "asset:read",
            "asset:update",
            "asset:delete",
          ],
          midataGroupMappings: [
            {
              groupId: 1643,
              roleClasses: [
                "Group::Pfadi::Einheitsleitung",
                "Group::Pfadi::Mitleitung",
              ],
            },
          ],
          allowedClients: ["pfadimh-admin"],
        },
        {
          name: "JungLeiter",
          description: "JungLeiter role with limited permissions",
          permissions: ["page:update", "admin-ui:read", "asset:read"],
          midataGroupMappings: [
            {
              groupId: 1642,
              roleClasses: ["Group::Woelfe::Mitleitung"],
            },
          ],
          allowedClients: ["pfadimh-admin"],
        },
      ],
    },
  });
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export function authClientsCol(): Collection<AuthClient> {
  return db.collection<AuthClient>("auth-clients");
}

export function authCodesCol(): Collection<StoredAuthCode> {
  return db.collection<StoredAuthCode>("auth-codes");
}

export function accessTokensCol(): Collection<StoredAccessToken> {
  return db.collection<StoredAccessToken>("auth-access-tokens");
}

export function pendingAuthCol(): Collection<PendingAuthorization> {
  return db.collection<PendingAuthorization>("auth-pending");
}

// ---------------------------------------------------------------------------
// Pending authorizations
// ---------------------------------------------------------------------------

export async function storePendingAuth(
  pending: PendingAuthorization
): Promise<void> {
  await pendingAuthCol().insertOne(pending);
}

export async function consumePendingAuth(
  state: string
): Promise<PendingAuthorization | null> {
  return pendingAuthCol().findOneAndDelete({ state });
}

export async function findPendingAuth(
  state: string
): Promise<PendingAuthorization | null> {
  return pendingAuthCol().findOne({ state });
}

// ---------------------------------------------------------------------------
// Auth clients
// ---------------------------------------------------------------------------

export async function findClient(
  clientId: string
): Promise<AuthClient | null> {
  return authClientsCol().findOne({ clientId });
}

// ---------------------------------------------------------------------------
// Auth codes
// ---------------------------------------------------------------------------

export async function storeAuthCode(code: StoredAuthCode): Promise<void> {
  await authCodesCol().insertOne(code);
}

export async function consumeAuthCode(
  code: string
): Promise<StoredAuthCode | null> {
  return authCodesCol().findOneAndDelete({ code });
}

// ---------------------------------------------------------------------------
// Access tokens
// ---------------------------------------------------------------------------

export async function storeAccessToken(
  token: StoredAccessToken
): Promise<void> {
  await accessTokensCol().insertOne(token);
}

export async function findAccessToken(
  token: string
): Promise<StoredAccessToken | null> {
  return accessTokensCol().findOne({ token });
}

// ---------------------------------------------------------------------------
// Security config (shared with admin app)
// ---------------------------------------------------------------------------

export async function getSecurityConfig(): Promise<SecurityConfig> {
  const doc = await db
    .collection("security")
    .findOne({ type: "securityConfig" });
  if (!doc) {
    return { roles: [] };
  }
  return doc.data as SecurityConfig;
}

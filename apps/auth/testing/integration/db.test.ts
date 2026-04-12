import { MongoDBContainer, type StartedMongoDBContainer } from "@testcontainers/mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  initDb,
  storePendingAuth,
  consumePendingAuth,
  findPendingAuth,
  storeAuthCode,
  consumeAuthCode,
  storeAccessToken,
  findAccessToken,
  findClient,
  getSecurityConfig,
  authClientsCol,
} from "@/lib/db";
import { hashSecret } from "@/lib/crypto";
import type { PendingAuthorization, StoredAuthCode, MiDataUserInfo } from "@/types";

const fakeUserInfo: MiDataUserInfo = {
  sub: "11001",
  first_name: "Test",
  last_name: "User",
  nickname: "Tester",
  email: "test@example.com",
  company_name: null,
  company: false,
  address_care_of: null,
  street: "Teststr",
  housenumber: "1",
  postbox: null,
  zip_code: "8000",
  town: "Zurich",
  country: "CH",
  gender: "m",
  birthday: "2000-01-01",
  language: "de",
  primary_group_id: 1172,
  kantonalverband_id: 2,
  roles: [],
};

describe("Auth DB operations (integration)", () => {
  let container: StartedMongoDBContainer;

  beforeAll(async () => {
    container = await new MongoDBContainer("mongo:7").start();
    const host = container.getHost();
    const port = container.getMappedPort(27017);
    const url = `mongodb://${host}:${port}/?directConnection=true`;
    await initDb(url, "auth_test");

    // Seed a test client
    await authClientsCol().insertOne({
      clientId: "test-client",
      clientSecretHash: hashSecret("test-secret"),
      name: "Test Client",
      description: "For testing",
      redirectUris: ["http://localhost:4000/callback"],
    });
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  });

  describe("pending authorizations", () => {
    it("stores and finds a pending auth", async () => {
      const pending: PendingAuthorization = {
        state: "state-1",
        clientId: "test-client",
        redirectUri: "http://localhost:4000/callback",
        clientState: "client-state-1",
        scope: "openid",
        createdAt: new Date(),
      };
      await storePendingAuth(pending);
      const found = await findPendingAuth("state-1");
      expect(found).toBeTruthy();
      expect(found!.clientId).toBe("test-client");
    });

    it("consumes a pending auth (one-time use)", async () => {
      const pending: PendingAuthorization = {
        state: "state-consume",
        clientId: "test-client",
        redirectUri: "http://localhost:4000/callback",
        clientState: "cs",
        scope: "openid",
        createdAt: new Date(),
      };
      await storePendingAuth(pending);

      const first = await consumePendingAuth("state-consume");
      expect(first).toBeTruthy();
      expect(first!.state).toBe("state-consume");

      const second = await consumePendingAuth("state-consume");
      expect(second).toBeNull();
    });
  });

  describe("auth codes", () => {
    it("stores and consumes an auth code", async () => {
      const code: StoredAuthCode = {
        code: "code-1",
        clientId: "test-client",
        userId: "11001",
        userInfo: fakeUserInfo,
        roles: ["Admin"],
        redirectUri: "http://localhost:4000/callback",
        scope: "openid",
        createdAt: new Date(),
      };
      await storeAuthCode(code);

      const consumed = await consumeAuthCode("code-1");
      expect(consumed).toBeTruthy();
      expect(consumed!.roles).toEqual(["Admin"]);
    });

    it("returns null for already-consumed code", async () => {
      const code: StoredAuthCode = {
        code: "code-once",
        clientId: "test-client",
        userId: "11001",
        userInfo: fakeUserInfo,
        roles: [],
        redirectUri: "http://localhost:4000/callback",
        scope: "openid",
        createdAt: new Date(),
      };
      await storeAuthCode(code);
      await consumeAuthCode("code-once");
      const second = await consumeAuthCode("code-once");
      expect(second).toBeNull();
    });
  });

  describe("access tokens", () => {
    it("stores and finds an access token", async () => {
      await storeAccessToken({
        token: "tok-1",
        userId: "11001",
        clientId: "test-client",
        userInfo: fakeUserInfo,
        roles: ["Leiter"],
        scope: "openid",
        createdAt: new Date(),
      });

      const found = await findAccessToken("tok-1");
      expect(found).toBeTruthy();
      expect(found!.roles).toEqual(["Leiter"]);
    });

    it("returns null for unknown token", async () => {
      const found = await findAccessToken("nonexistent");
      expect(found).toBeNull();
    });
  });

  describe("clients", () => {
    it("finds the seeded client", async () => {
      const client = await findClient("test-client");
      expect(client).toBeTruthy();
      expect(client!.name).toBe("Test Client");
    });

    it("returns null for unknown client", async () => {
      const client = await findClient("unknown");
      expect(client).toBeNull();
    });
  });

  describe("security config", () => {
    it("returns seeded default roles when no config was manually created", async () => {
      const config = await getSecurityConfig();
      const names = config.roles.map((r) => r.name);
      expect(names).toEqual(["Admin", "Leiter", "JungLeiter"]);
    });
  });
});

import { MongoDBContainer, type StartedMongoDBContainer } from "@testcontainers/mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Hono } from "hono";
import { initDb, authClientsCol, storeAuthCode, storeAccessToken } from "@/lib/db";
import { initKeys, verifyJwt, getJwks } from "@/lib/jwt";
import { hashSecret, generateCode } from "@/lib/crypto";
import { discoveryRoutes } from "@/routes/discovery";
import { authorizeRoutes } from "@/routes/authorize";
import { tokenRoutes } from "@/routes/token";
import { userinfoRoutes } from "@/routes/userinfo";
import type { EnvConfig, MiDataUserInfo, StoredAuthCode } from "@/types";
import { MongoClient } from "mongodb";

const TEST_ISSUER = "http://localhost:3099";

const env: EnvConfig = {
  port: 3099,
  issuerUrl: TEST_ISSUER,
  midataAuthorizeUrl: "http://midata.test/oauth/authorize",
  midataTokenUrl: "http://midata.test/oauth/token",
  midataUserinfoUrl: "http://midata.test/oauth/userinfo",
  midataClientId: "test-midata-client",
  midataClientSecret: "test-midata-secret",
  mongoConnectionString: "", // set in beforeAll
  mongoDbName: "auth_flow_test",
};

const fakeUserInfo: MiDataUserInfo = {
  id: 11001,
  first_name: "Test",
  last_name: "Admin",
  nickname: "Tester",
  email: "admin@test.com",
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
  primary_group_id: 1641,
  kantonalverband_id: 2,
  roles: [
    {
      group_id: 1641,
      group_name: "Abteilung",
      role: "Group::Abteilung::Abteilungsleitung",
      role_class: "Group::Abteilung::Abteilungsleitung",
      role_name: "Abteilungsleitung",
      permissions: [],
    },
  ],
};

describe("Auth flow (integration)", () => {
  let container: StartedMongoDBContainer;
  let app: Hono;

  beforeAll(async () => {
    container = await new MongoDBContainer("mongo:7").start();
    const host = container.getHost();
    const port = container.getMappedPort(27017);
    env.mongoConnectionString = `mongodb://${host}:${port}/?directConnection=true`;

    await initKeys();
    await initDb(env.mongoConnectionString, env.mongoDbName);

    // Seed test client
    await authClientsCol().insertOne({
      clientId: "test-app",
      clientSecretHash: hashSecret("test-secret"),
      name: "Test App",
      description: "",
      redirectUris: ["http://localhost:4000/callback"],
    });

    // Seed security config with a role mapping
    const mongo = new MongoClient(env.mongoConnectionString, { directConnection: true });
    await mongo.connect();
    await mongo.db(env.mongoDbName).collection("security").insertOne({
      type: "securityConfig",
      data: {
        roles: [
          {
            name: "Admin",
            description: "Admin role",
            permissions: ["global-admin"],
            midataGroupMappings: [
              {
                groupId: 1641,
                roleClasses: ["Group::Abteilung::Abteilungsleitung"],
              },
            ],
            allowedClients: ["test-app"],
          },
        ],
      },
    });
    await mongo.close();

    // Build the Hono app
    app = new Hono();
    app.route("/", discoveryRoutes(env));
    app.route("/", authorizeRoutes(env));
    app.route("/", tokenRoutes(env));
    app.route("/", userinfoRoutes());
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  });

  // ── Discovery ────────────────────────────────────────────────────

  describe("discovery", () => {
    it("returns valid openid-configuration", async () => {
      const res = await app.request("/.well-known/openid-configuration");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.issuer).toBe(TEST_ISSUER);
      expect(body.authorization_endpoint).toBe(`${TEST_ISSUER}/authorize`);
      expect(body.token_endpoint).toBe(`${TEST_ISSUER}/token`);
      expect(body.userinfo_endpoint).toBe(`${TEST_ISSUER}/userinfo`);
      expect(body.jwks_uri).toBe(`${TEST_ISSUER}/.well-known/jwks.json`);
    });

    it("returns JWKS with RS256 key", async () => {
      const res = await app.request("/.well-known/jwks.json");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.keys).toHaveLength(1);
      expect(body.keys[0].alg).toBe("RS256");
    });
  });

  // ── Authorize ────────────────────────────────────────────────────

  describe("authorize", () => {
    it("redirects to MiData with valid params", async () => {
      const url = new URL(`${TEST_ISSUER}/authorize`);
      url.searchParams.set("client_id", "test-app");
      url.searchParams.set("redirect_uri", "http://localhost:4000/callback");
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", "openid");
      url.searchParams.set("state", "my-state");

      const res = await app.request(url.toString(), { redirect: "manual" });
      expect(res.status).toBe(302);
      const location = res.headers.get("location")!;
      expect(location).toContain("midata.test/oauth/authorize");
    });

    it("rejects unknown client_id", async () => {
      const url = `${TEST_ISSUER}/authorize?client_id=unknown&redirect_uri=http://x.com/cb&scope=openid&state=s`;
      const res = await app.request(url);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("invalid_client");
    });

    it("rejects unregistered redirect_uri", async () => {
      const url = `${TEST_ISSUER}/authorize?client_id=test-app&redirect_uri=http://evil.com/cb&scope=openid&state=s`;
      const res = await app.request(url);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("invalid_request");
    });

    it("rejects missing client_id", async () => {
      const url = `${TEST_ISSUER}/authorize?redirect_uri=http://x.com/cb&scope=openid&state=s`;
      const res = await app.request(url);
      expect(res.status).toBe(400);
    });
  });

  // ── Token ────────────────────────────────────────────────────────

  describe("token", () => {
    async function seedCode(overrides: Partial<StoredAuthCode> = {}): Promise<string> {
      const code = generateCode();
      await storeAuthCode({
        code,
        clientId: "test-app",
        userId: "11001",
        userInfo: fakeUserInfo,
        roles: ["Admin"],
        redirectUri: "http://localhost:4000/callback",
        scope: "openid",
        createdAt: new Date(),
        ...overrides,
      });
      return code;
    }

    it("exchanges a valid code for tokens", async () => {
      const code = await seedCode();
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: "test-app",
        client_secret: "test-secret",
        redirect_uri: "http://localhost:4000/callback",
      });

      const res = await app.request(`${TEST_ISSUER}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.access_token).toBeTruthy();
      expect(json.id_token).toBeTruthy();
      expect(json.token_type).toBe("Bearer");

      // Verify id_token claims
      const payload = await verifyJwt(json.id_token);
      expect(payload.iss).toBe(TEST_ISSUER);
      expect(payload.sub).toBe("11001"); // String(id)
      expect(payload.aud).toBe("test-app");
      expect(payload.roles).toEqual(["Admin"]);
    });

    it("omits nonce from id_token when not provided", async () => {
      const code = await seedCode({ nonce: undefined });
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: "test-app",
        client_secret: "test-secret",
      });

      const res = await app.request(`${TEST_ISSUER}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      const json = await res.json();
      const payload = await verifyJwt(json.id_token);
      expect(payload.nonce).toBeUndefined();
    });

    it("rejects invalid code", async () => {
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code: "bogus",
        client_id: "test-app",
        client_secret: "test-secret",
      });

      const res = await app.request(`${TEST_ISSUER}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("invalid_grant");
    });

    it("rejects wrong client_secret", async () => {
      const code = await seedCode();
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: "test-app",
        client_secret: "wrong-secret",
      });

      const res = await app.request(`${TEST_ISSUER}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      expect(res.status).toBe(401);
    });

    it("rejects already-consumed code", async () => {
      const code = await seedCode();
      const makeBody = () =>
        new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: "test-app",
          client_secret: "test-secret",
        });

      // First exchange succeeds
      const res1 = await app.request(`${TEST_ISSUER}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: makeBody().toString(),
      });
      expect(res1.status).toBe(200);

      // Second exchange fails
      const res2 = await app.request(`${TEST_ISSUER}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: makeBody().toString(),
      });
      expect(res2.status).toBe(400);
    });
  });

  // ── Userinfo ─────────────────────────────────────────────────────

  describe("userinfo", () => {
    it("returns profile with valid access token", async () => {
      const token = generateCode(48);
      await storeAccessToken({
        token,
        userId: "11001",
        clientId: "test-app",
        userInfo: fakeUserInfo,
        roles: ["Admin"],
        scope: "openid",
        createdAt: new Date(),
      });

      const res = await app.request(`${TEST_ISSUER}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.sub).toBe("11001"); // String(id)
      expect(json.name).toBe("Test Admin");
      expect(json.roles).toEqual(["Admin"]);
    });

    it("rejects invalid token", async () => {
      const res = await app.request(`${TEST_ISSUER}/userinfo`, {
        headers: { Authorization: "Bearer bogus-token" },
      });
      expect(res.status).toBe(401);
    });

    it("rejects missing Authorization header", async () => {
      const res = await app.request(`${TEST_ISSUER}/userinfo`);
      expect(res.status).toBe(401);
    });
  });
});

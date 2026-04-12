import {
  MongoDBContainer,
  type StartedMongoDBContainer,
} from "@testcontainers/mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoService } from "@/lib/db/db-mongo-impl";

describe("AuthClient CRUD (integration)", () => {
  let container: StartedMongoDBContainer;
  let service: MongoService;

  beforeAll(async () => {
    container = await new MongoDBContainer("mongo:7").start();
    const host = container.getHost();
    const port = container.getMappedPort(27017);
    const url = `mongodb://${host}:${port}/?directConnection=true`;
    service = new MongoService(url, "auth_clients_test");
  }, 120_000);

  afterAll(async () => {
    await service?.disconnect();
    await container?.stop();
  });

  it("saves and retrieves a client", async () => {
    await service.saveAuthClient({
      clientId: "test-app",
      clientSecretHash: "abc123",
      name: "Test App",
      description: "For testing",
      redirectUris: ["http://localhost:4000/callback"],
    });

    const client = await service.getAuthClient("test-app");
    expect(client).toBeTruthy();
    expect(client!.name).toBe("Test App");
    expect(client!.clientSecretHash).toBe("abc123");
    expect(client!.redirectUris).toEqual(["http://localhost:4000/callback"]);
  });

  it("returns all clients", async () => {
    await service.saveAuthClient({
      clientId: "second-app",
      clientSecretHash: "def456",
      name: "Second App",
      description: "",
      redirectUris: ["http://localhost:5000/cb"],
    });

    const clients = await service.getAuthClients();
    const ids = clients.map((c) => c.clientId);
    expect(ids).toContain("test-app");
    expect(ids).toContain("second-app");
  });

  it("upserts when saving with existing clientId", async () => {
    await service.saveAuthClient({
      clientId: "test-app",
      clientSecretHash: "updated-hash",
      name: "Updated App",
      description: "Updated",
      redirectUris: ["http://localhost:4000/new-callback"],
    });

    const client = await service.getAuthClient("test-app");
    expect(client!.name).toBe("Updated App");
    expect(client!.clientSecretHash).toBe("updated-hash");
  });

  it("deletes a client", async () => {
    await service.deleteAuthClient("second-app");
    const client = await service.getAuthClient("second-app");
    expect(client).toBeNull();
  });

  it("returns null for unknown clientId", async () => {
    const client = await service.getAuthClient("nonexistent");
    expect(client).toBeNull();
  });
});

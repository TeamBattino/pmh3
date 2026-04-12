import {
  MongoDBContainer,
  type StartedMongoDBContainer,
} from "@testcontainers/mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoService } from "@/lib/db/db-mongo-impl";
import type { SecurityConfig } from "@/lib/security/security-config";

describe("SecurityConfig extended fields (integration)", () => {
  let container: StartedMongoDBContainer;
  let service: MongoService;

  beforeAll(async () => {
    container = await new MongoDBContainer("mongo:7").start();
    const host = container.getHost();
    const port = container.getMappedPort(27017);
    const url = `mongodb://${host}:${port}/?directConnection=true`;
    service = new MongoService(url, "security_ext_test");

    // Seed initial config
    await service.saveSecurityConfig({
      roles: [
        { name: "Seed", description: "seed", permissions: ["admin-ui:read"] },
      ],
    } as any);
  }, 120_000);

  afterAll(async () => {
    await service?.disconnect();
    await container?.stop();
  });

  it("persists midataGroupMappings on a role", async () => {
    const config: SecurityConfig = {
      roles: [
        {
          name: "Admin",
          description: "Admin role",
          permissions: ["global-admin"],
          midataGroupMappings: [
            {
              groupId: 1172,
              roleClasses: [
                "Group::Abteilung::Abteilungsleitung",
                "Group::Abteilung::Webmaster",
              ],
            },
            {
              groupId: 12460,
              roleClasses: [],
            },
          ],
          allowedClients: ["pfadimh-admin"],
        },
      ],
    };

    await service.saveSecurityConfig(config);
    const loaded = await service.getSecurityConfig();

    expect(loaded.roles).toHaveLength(1);
    const admin = loaded.roles[0]!;
    expect(admin.midataGroupMappings).toHaveLength(2);
    expect(admin.midataGroupMappings[0]!.groupId).toBe(1172);
    expect(admin.midataGroupMappings[0]!.roleClasses).toEqual([
      "Group::Abteilung::Abteilungsleitung",
      "Group::Abteilung::Webmaster",
    ]);
    expect(admin.midataGroupMappings[1]!.groupId).toBe(12460);
    expect(admin.midataGroupMappings[1]!.roleClasses).toEqual([]);
  });

  it("persists allowedClients on a role", async () => {
    const config: SecurityConfig = {
      roles: [
        {
          name: "Leiter",
          description: "",
          permissions: [],
          midataGroupMappings: [],
          allowedClients: ["pfadimh-admin", "other-service"],
        },
      ],
    };

    await service.saveSecurityConfig(config);
    const loaded = await service.getSecurityConfig();
    expect(loaded.roles[0]!.allowedClients).toEqual([
      "pfadimh-admin",
      "other-service",
    ]);
  });

  it("handles legacy roles without new fields", async () => {
    // Simulate legacy data written before midataGroupMappings existed
    const rawDb = service.rawDb();
    await rawDb.collection("security").updateOne(
      { type: "securityConfig" },
      {
        $set: {
          data: {
            roles: [
              {
                name: "Legacy",
                description: "Old role",
                permissions: ["admin-ui:read"],
                // No midataGroupMappings or allowedClients
              },
            ],
          },
        },
      }
    );

    const loaded = await service.getSecurityConfig();
    const legacy = loaded.roles[0]!;
    expect(legacy.name).toBe("Legacy");
    // Fields are undefined, not crash
    expect(legacy.midataGroupMappings).toBeUndefined();
    expect(legacy.allowedClients).toBeUndefined();
  });
});

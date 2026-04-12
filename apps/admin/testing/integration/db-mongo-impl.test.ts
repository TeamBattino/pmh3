import {
  MongoDBContainer,
  type StartedMongoDBContainer,
} from "@testcontainers/mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoService } from "@/lib/db/db-mongo-impl";

/**
 * Exercises the pure MongoService CRUD layer against an ephemeral MongoDB
 * container spun up via testcontainers. This file intentionally does NOT
 * import from `db-bootstrap.ts` / `@pfadipuck/puck-web` — MongoService is
 * standalone, and pulling puck-web into Node tests pulls in React and
 * trips vitest worker IPC on Bun.
 */

const fixturePage = {
  content: [],
  root: { props: { title: "About" } },
};

const fixtureNavbar = {
  content: [],
  root: { props: { logo: "custom.svg" } },
};

describe("MongoService (integration)", () => {
  let container: StartedMongoDBContainer;
  let service: MongoService;

  beforeAll(async () => {
    container = await new MongoDBContainer("mongo:7").start();
    const host = container.getHost();
    const port = container.getMappedPort(27017);
    const url = `mongodb://${host}:${port}/?directConnection=true`;
    service = new MongoService(url, "pfadimh_test");
    // Seed the minimum state the getters assume to exist.
    await service.saveNavbar({ content: [], root: { props: {} } } as any);
    await service.saveFooter({ content: [], root: { props: {} } } as any);
    await service.saveSecurityConfig({
      roles: [
        { name: "Admin", description: "", permissions: ["global-admin"] },
      ],
    } as any);
  }, 120_000);

  afterAll(async () => {
    await service?.disconnect();
    await container?.stop();
  });

  describe("pages", () => {
    it("saves, reads, deletes, and lists a page", async () => {
      const path = "/about";
      await service.savePage(path, fixturePage as any);

      const loaded = await service.getPage(path);
      expect(loaded).toEqual(fixturePage);

      const paths = await service.getAllPaths();
      expect(paths).toContain(path);

      await service.deletePage(path);
      expect(await service.getPage(path)).toBeUndefined();
    });

    it("returns undefined for an unknown page", async () => {
      expect(await service.getPage("/nope")).toBeUndefined();
    });
  });

  describe("navbar", () => {
    it("reads and overwrites", async () => {
      await service.saveNavbar(fixtureNavbar as any);
      const loaded = await service.getNavbar();
      expect(loaded).toEqual(fixtureNavbar);
    });
  });

  describe("security config", () => {
    it("persists role updates", async () => {
      const initial = await service.getSecurityConfig();
      expect(initial.roles.map((r) => r.name)).toContain("Admin");

      const updated = {
        roles: [
          ...initial.roles,
          { name: "Test", description: "test role", permissions: ["admin-ui:read"] },
        ],
      };
      await service.saveSecurityConfig(updated as any);

      const loaded = await service.getSecurityConfig();
      expect(loaded.roles.map((r) => r.name)).toContain("Test");
    });
  });
});

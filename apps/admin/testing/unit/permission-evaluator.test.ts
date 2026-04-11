import { describe, expect, it } from "vitest";
import { hasPermission } from "@/lib/security/permission-evaluator";
import type { Session } from "next-auth";

/**
 * Unit tests for the permission policy evaluator. Pure function — no
 * external services, no React, no DB.
 */

function makeSession(permissions: string[]): Session {
  return {
    user: {
      id: "u1",
      email: "test@example.com",
      name: "Test",
      roles: [],
      permissions,
    } as any,
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  };
}

describe("hasPermission", () => {
  it("denies missing session", () => {
    expect(hasPermission(null, { any: ["page:update"] })).toBe(false);
    expect(hasPermission(undefined, { all: ["page:update"] })).toBe(false);
  });

  it("grants everything when user has global-admin", () => {
    const s = makeSession(["global-admin"]);
    expect(hasPermission(s, { all: ["page:delete", "role-permissions:update"] })).toBe(true);
    expect(hasPermission(s, { any: ["page:update"] })).toBe(true);
  });

  describe("`all` policies", () => {
    it("grants when every required permission is present", () => {
      const s = makeSession(["page:create", "page:update", "page:delete"]);
      expect(hasPermission(s, { all: ["page:create", "page:update"] })).toBe(true);
    });

    it("denies when any required permission is missing", () => {
      const s = makeSession(["page:create", "page:update"]);
      expect(hasPermission(s, { all: ["page:create", "page:delete"] })).toBe(false);
    });
  });

  describe("`any` policies", () => {
    it("grants when at least one permission is present", () => {
      const s = makeSession(["page:update"]);
      expect(hasPermission(s, { any: ["page:create", "page:update"] })).toBe(true);
    });

    it("denies when no matching permission is present", () => {
      const s = makeSession(["admin-ui:read"]);
      expect(hasPermission(s, { any: ["page:create", "page:update"] })).toBe(false);
    });
  });

  describe("combined `all` + `any`", () => {
    it("requires both clauses to hold", () => {
      const s = makeSession(["page:update", "admin-ui:read"]);
      // any: satisfied, all: satisfied → true
      expect(
        hasPermission(s, { any: ["page:update"], all: ["admin-ui:read"] })
      ).toBe(true);
      // any: satisfied, all: NOT satisfied → false
      expect(
        hasPermission(s, { any: ["page:update"], all: ["footer:update"] })
      ).toBe(false);
    });
  });

  describe("empty policy", () => {
    it("grants when no constraints are given (but session exists)", () => {
      const s = makeSession([]);
      expect(hasPermission(s, {})).toBe(true);
    });
  });
});

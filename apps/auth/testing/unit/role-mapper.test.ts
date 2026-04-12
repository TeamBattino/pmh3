import { describe, expect, it } from "vitest";
import { userMatchesMapping } from "@/lib/role-mapper";
import type { MiDataRole, Role } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUserRole(overrides: Partial<MiDataRole> = {}): MiDataRole {
  return {
    group_id: 1172,
    group_name: "Abteilung",
    role: "Group::Abteilung::Abteilungsleitung",
    role_class: "Group::Abteilung::Abteilungsleitung",
    role_name: "Abteilungsleitung",
    permissions: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// userMatchesMapping (pure function)
// ---------------------------------------------------------------------------

describe("userMatchesMapping", () => {
  it("matches when group_id and role_class both match", () => {
    const userRoles = [makeUserRole()];
    expect(
      userMatchesMapping(
        userRoles,
        1172,
        ["Group::Abteilung::Abteilungsleitung"]
      )
    ).toBe(true);
  });

  it("rejects when group_id matches but role_class does not", () => {
    const userRoles = [makeUserRole({ role_class: "Group::Abteilung::Mitglied" })];
    expect(
      userMatchesMapping(
        userRoles,
        1172,
        ["Group::Abteilung::Abteilungsleitung"]
      )
    ).toBe(false);
  });

  it("matches any role in group when roleClasses is empty (wildcard)", () => {
    const userRoles = [makeUserRole({ role_class: "Group::Abteilung::Mitglied" })];
    expect(userMatchesMapping(userRoles, 1172, [])).toBe(true);
  });

  it("rejects when group_id does not match", () => {
    const userRoles = [makeUserRole({ group_id: 9999 })];
    expect(
      userMatchesMapping(
        userRoles,
        1172,
        ["Group::Abteilung::Abteilungsleitung"]
      )
    ).toBe(false);
  });

  it("rejects when user has no roles", () => {
    expect(
      userMatchesMapping([], 1172, ["Group::Abteilung::Abteilungsleitung"])
    ).toBe(false);
  });

  it("matches when one of multiple role_classes matches", () => {
    const userRoles = [makeUserRole({ role_class: "Group::Abteilung::Webmaster" })];
    expect(
      userMatchesMapping(
        userRoles,
        1172,
        ["Group::Abteilung::Abteilungsleitung", "Group::Abteilung::Webmaster"]
      )
    ).toBe(true);
  });

  it("matches when user has multiple roles in the same group", () => {
    const userRoles = [
      makeUserRole({ role_class: "Group::Abteilung::Mitglied" }),
      makeUserRole({ role_class: "Group::Abteilung::Abteilungsleitung" }),
    ];
    expect(
      userMatchesMapping(
        userRoles,
        1172,
        ["Group::Abteilung::Abteilungsleitung"]
      )
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Role matching across multiple config roles (higher-level logic)
// ---------------------------------------------------------------------------

describe("matchRoles (simulated)", () => {
  // Simulate the matching loop from mapRoles without the DB call
  function matchRoles(userRoles: MiDataRole[], configRoles: Role[]): string[] {
    const matched: string[] = [];
    for (const role of configRoles) {
      const mappings = role.midataGroupMappings;
      if (!mappings || mappings.length === 0) continue;
      const hasMatch = mappings.some((m) =>
        userMatchesMapping(userRoles, m.groupId, m.roleClasses)
      );
      if (hasMatch) matched.push(role.name);
    }
    return matched;
  }

  const configRoles: Role[] = [
    {
      name: "Admin",
      description: "",
      permissions: ["global-admin"],
      midataGroupMappings: [
        { groupId: 1172, roleClasses: ["Group::Abteilung::Abteilungsleitung"] },
      ],
      allowedClients: ["pfadimh-admin"],
    },
    {
      name: "Leiter",
      description: "",
      permissions: [],
      midataGroupMappings: [
        { groupId: 5678, roleClasses: ["Group::Pfadi::Mitleitung"] },
      ],
      allowedClients: ["pfadimh-admin"],
    },
    {
      name: "NoMapping",
      description: "",
      permissions: [],
      midataGroupMappings: [],
      allowedClients: [],
    },
  ];

  it("user matching Admin gets ['Admin']", () => {
    const userRoles = [makeUserRole({ group_id: 1172 })];
    expect(matchRoles(userRoles, configRoles)).toEqual(["Admin"]);
  });

  it("user matching Leiter gets ['Leiter']", () => {
    const userRoles = [
      makeUserRole({
        group_id: 5678,
        role_class: "Group::Pfadi::Mitleitung",
      }),
    ];
    expect(matchRoles(userRoles, configRoles)).toEqual(["Leiter"]);
  });

  it("user in both groups gets both roles", () => {
    const userRoles = [
      makeUserRole({ group_id: 1172 }),
      makeUserRole({
        group_id: 5678,
        role_class: "Group::Pfadi::Mitleitung",
      }),
    ];
    expect(matchRoles(userRoles, configRoles)).toEqual(["Admin", "Leiter"]);
  });

  it("user with no matching groups gets empty array", () => {
    const userRoles = [makeUserRole({ group_id: 7777 })];
    expect(matchRoles(userRoles, configRoles)).toEqual([]);
  });

  it("role with empty midataGroupMappings is never matched", () => {
    const userRoles = [makeUserRole()];
    const matched = matchRoles(userRoles, configRoles);
    expect(matched).not.toContain("NoMapping");
  });
});

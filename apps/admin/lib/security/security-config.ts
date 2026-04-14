export const assignablePermissions = [
  // @keep-sorted
  "admin-ui:read",
  "asset:create",
  "asset:delete",
  "asset:read",
  "asset:update",
  "global-admin",
  "oauth-clients:manage",
  "page:create",
  "page:delete",
  "page:update",
  "role-permissions:read",
  "role-permissions:update",
  "web:update",
] as const;

/**
 * Represents a specific resource permission that can be assigned to roles.
 */
export type Permission = (typeof assignablePermissions)[number];

export interface SecurityConfig {
  roles: Role[];
}

/**
 * A MiData group + role_class combination. A user is matched when they hold
 * any of the listed role_classes within the given group. If `roleClasses` is
 * empty, any role in that group matches.
 */
export type MidataGroupMapping = {
  groupId: number;
  roleClasses: string[];
};

export type Role = {
  name: string;
  description: string;
  permissions: Permission[];
  /**
   * MiData group + role mappings. A user gets this role if they match at
   * least one entry: they must belong to the group AND hold one of the
   * listed role_classes (or any role if roleClasses is empty).
   */
  midataGroupMappings: MidataGroupMapping[];
  /** OAuth client IDs that users with this role are allowed to access. */
  allowedClients: string[];
};

export const defaultSecurityConfig: SecurityConfig = {
  roles: [
    {
      name: "Admin",
      description: "Admin role with all permissions",
      permissions: ["global-admin"],
      midataGroupMappings: [
        {
          groupId: 1172,
          roleClasses: ["Group::Abteilung::Abteilungsleitung", "Group::Abteilung::Webmaster"],
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
        "web:update",
        "asset:create",
        "asset:read",
        "asset:update",
        "asset:delete",
      ],
      midataGroupMappings: [
        {
          groupId: 1643,
          roleClasses: ["Group::Pfadi::Einheitsleitung", "Group::Pfadi::Mitleitung"],
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
};

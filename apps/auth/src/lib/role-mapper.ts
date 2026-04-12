import type { MiDataUserInfo, MiDataRole } from "../types";
import { getSecurityConfig } from "./db";

/**
 * Given a MiData user's profile, determine which internal roles they have
 * by matching their group memberships against each Role's midataGroupMappings.
 *
 * A mapping matches when the user holds a role in the specified group AND
 * (if roleClasses is non-empty) the role_class is in the configured list.
 * If roleClasses is empty, any role in that group matches.
 */
export async function mapRoles(userInfo: MiDataUserInfo): Promise<string[]> {
  const config = await getSecurityConfig();

  const matched: string[] = [];
  for (const role of config.roles) {
    const mappings = role.midataGroupMappings;
    if (!mappings || mappings.length === 0) continue;

    const hasMatch = mappings.some((mapping) =>
      userMatchesMapping(userInfo.roles, mapping.groupId, mapping.roleClasses)
    );
    if (hasMatch) {
      matched.push(role.name);
    }
  }

  return matched;
}

/** Exported for unit testing — pure function, no DB dependency. */
export function userMatchesMapping(
  userRoles: MiDataRole[],
  groupId: number,
  roleClasses: string[]
): boolean {
  // Find user roles that belong to this group
  const rolesInGroup = userRoles.filter((r) => r.group_id === groupId);
  if (rolesInGroup.length === 0) return false;

  // If no roleClasses specified, any role in the group matches
  if (!roleClasses || roleClasses.length === 0) return true;

  // Check if any of the user's roles in this group match a configured role_class
  return rolesInGroup.some((r) => roleClasses.includes(r.role_class));
}

/**
 * Check whether any of the given roles grant access to a specific OAuth client.
 */
export async function rolesAllowClient(
  roleNames: string[],
  clientId: string
): Promise<boolean> {
  const config = await getSecurityConfig();
  for (const role of config.roles) {
    if (!roleNames.includes(role.name)) continue;
    if (role.permissions?.includes("global-admin")) return true;
    if (role.allowedClients?.includes(clientId)) return true;
  }
  return false;
}

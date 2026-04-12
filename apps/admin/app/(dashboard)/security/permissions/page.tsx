import { PermissionsManager } from "@/components/security/PermissionsManager";
import { requireServerPermission } from "@/lib/security/server-guard";

export default async function PermissionsPage() {
  await requireServerPermission({ all: ["role-permissions:read"] });

  return <PermissionsManager />;
}

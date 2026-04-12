import SecurityManager from "@/components/security/SecurityManager";
import { requireServerPermission } from "@/lib/security/server-guard";

export default async function RolesPage() {
  await requireServerPermission({ all: ["role-permissions:read"] });

  return <SecurityManager />;
}

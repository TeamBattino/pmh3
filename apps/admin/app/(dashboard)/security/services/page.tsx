import { OAuthClientManager } from "@/components/security/OAuthClientManager";
import { requireServerPermission } from "@/lib/security/server-guard";

export default async function ServicesPage() {
  await requireServerPermission({ all: ["oauth-clients:manage"] });

  return <OAuthClientManager />;
}

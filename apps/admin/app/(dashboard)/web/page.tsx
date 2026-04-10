import AdminPage from "@/components/admin/AdminPage";
import { requireServerPermission } from "@/lib/security/server-guard";

export default async function Page() {
  await requireServerPermission({ all: ["admin-ui:read"] });

  return <AdminPage />;
}

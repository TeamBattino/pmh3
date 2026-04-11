import { DocumentsPage } from "@/components/documents/DocumentsPage";
import { requireServerPermission } from "@/lib/security/server-guard";

export default async function Page() {
  await requireServerPermission({ all: ["asset:read"] });
  return <DocumentsPage />;
}

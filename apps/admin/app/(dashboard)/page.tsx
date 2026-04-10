import { PageHeading } from "@/components/ui/Heading";
import { requireServerPermission } from "@/lib/security/server-guard";

export default async function Page() {
  await requireServerPermission({ all: ["admin-ui:read"] });

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-4">
      <PageHeading>Welcome</PageHeading>
      <p className="text-muted-foreground">
        Select a section from the sidebar to get started.
      </p>
    </div>
  );
}

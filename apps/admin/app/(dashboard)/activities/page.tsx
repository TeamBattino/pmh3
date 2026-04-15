import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { listGroupsWithStatus } from "@/lib/activities/actions";
import { requireServerPermission } from "@/lib/security/server-guard";
import { statusLabel } from "@/components/activities/ActivityStatusLabel";
import { ChevronRight, Settings } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { PermissionGuard } from "@/components/security/PermissionGuard";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Activities" };
}

export default async function Page() {
  await requireServerPermission({
    any: ["activity:edit", "activity-admin:edit-settings"],
  });

  const entries = await listGroupsWithStatus();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Activities</h1>
          <p className="text-sm text-muted-foreground">
            Pick a group to edit its weekly activity.
          </p>
        </div>
        <PermissionGuard policy={{ all: ["activity-admin:edit-settings"] }}>
          <Button asChild variant="outline">
            <Link href="/activities/settings">
              <Settings data-icon="inline-start" />
              Settings
            </Link>
          </Button>
        </PermissionGuard>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No groups configured yet.{" "}
            <Link
              href="/activities/settings"
              className="text-admin-primary underline"
            >
              Set up groups
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {entries.map((entry) => (
            <Link
              key={entry.group.id}
              href={`/activities/${entry.group.id}`}
              className="group flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{entry.group.name}</span>
                <span className="text-xs text-muted-foreground">
                  {statusLabel(entry.status, entry.lastPublishedType)}
                </span>
              </div>
              <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

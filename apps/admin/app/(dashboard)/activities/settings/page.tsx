import { ActivitiesSettings } from "@/components/activities/SettingsForm";
import { Button } from "@/components/ui/Button";
import {
  getPlanningPlaceholder,
  listGroups,
  listLocations,
} from "@/lib/activities/actions";
import { requireServerPermission } from "@/lib/security/server-guard";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Activity Settings" };
}

export default async function Page() {
  await requireServerPermission({ all: ["activity-admin:edit-settings"] });

  const [groups, locations, planning] = await Promise.all([
    listGroups(),
    listLocations(),
    getPlanningPlaceholder(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/activities">
            <ChevronLeft data-icon="inline-start" />
            Activities
          </Link>
        </Button>
        <h1 className="mt-1 text-2xl font-semibold">Activity Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage groups, reusable locations, and the planning placeholder.
        </p>
      </div>

      <ActivitiesSettings
        initialGroups={groups}
        initialLocations={locations}
        initialPlanning={planning}
      />
    </div>
  );
}

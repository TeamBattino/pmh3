import { ActivityEditor } from "@/components/activities/ActivityEditor";
import { Button } from "@/components/ui/Button";
import {
  getOrCreateActivity,
  listGroups,
  listLocations,
} from "@/lib/activities/actions";
import { requireServerPermission } from "@/lib/security/server-guard";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Params = Promise<{ groupId: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { groupId } = await params;
  const groups = await listGroups();
  const g = groups.find((x) => x.id === groupId);
  return { title: g ? `${g.name} — Activities` : "Activity" };
}

export default async function Page({ params }: { params: Params }) {
  await requireServerPermission({ any: ["activity:edit"] });
  const { groupId } = await params;

  const [groups, locations, doc] = await Promise.all([
    listGroups(),
    listLocations(),
    getOrCreateActivity(groupId),
  ]);

  const group = groups.find((g) => g.id === groupId);
  if (!group) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/activities">
            <ChevronLeft data-icon="inline-start" />
            All groups
          </Link>
        </Button>
        <h1 className="mt-1 text-2xl font-semibold">{group.name}</h1>
      </div>

      <ActivityEditor group={group} initial={doc} locations={locations} />
    </div>
  );
}

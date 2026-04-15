import { requireServerPermission } from "@/lib/security/server-guard";
import { listGroups } from "@/lib/activities/db-activities";
import { NextResponse } from "next/server";

export async function GET() {
  await requireServerPermission({
    any: ["activity:edit", "activity-admin:edit-settings", "page:update"],
  });
  const groups = await listGroups();
  return NextResponse.json(groups);
}

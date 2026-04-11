import { MediaLanding } from "@/components/media/MediaLanding";
import { requireServerPermission } from "@/lib/security/server-guard";

export default async function Page() {
  await requireServerPermission({ all: ["asset:read"] });
  return <MediaLanding />;
}

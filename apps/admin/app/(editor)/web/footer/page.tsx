import { FooterEditor } from "@/components/FooterEditor";
import { getFooter } from "@/lib/db/db-actions";
import { requireServerPermission } from "@/lib/security/server-guard";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Footer Editor",
  };
}

export default async function Page() {
  await requireServerPermission({ all: ["footer:update"] });

  const data = await getFooter();

  return <FooterEditor data={data} />;
}

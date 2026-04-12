import { PageEditor } from "@/components/PageEditor";
import { defaultPageData } from "@pfadipuck/puck-web/config/page.config";
import { getPage } from "@/lib/db/db-actions";
import { requireServerPermission } from "@/lib/security/server-guard";
import { Metadata } from "next";

type Params = Promise<{ editPath: string[] }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { editPath = [] } = await params;
  const path = `/${editPath.join("/")}`;

  return {
    title: "Editor: " + path,
  };
}

export default async function Page({ params }: { params: Params }) {
  await requireServerPermission({ any: ["page:create", "page:update"] });

  const { editPath = [] } = await params;
  const path = `/${editPath.join("/")}`;
  const data = (await getPage(path)) ?? defaultPageData;

  return <PageEditor path={path} data={data} />;
}

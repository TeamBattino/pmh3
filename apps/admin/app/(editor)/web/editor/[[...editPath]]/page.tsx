import { PageEditor } from "@/components/PageEditor";
import { defaultPageData } from "@pfadipuck/puck-web/config/page.config";
import { defaultNavbarData } from "@pfadipuck/puck-web/config/navbar.config";
import { defaultFooterDoc } from "@pfadipuck/puck-web/lib/footer-doc";
import { getFile } from "@/lib/db/file-system-actions";
import { getFooter, getNavbar, getPage } from "@/lib/db/db-actions";
import { requireServerPermission } from "@/lib/security/server-guard";
import type { FileUrlResolver } from "@pfadipuck/puck-web/fields/file-picker-types";
import { Navbar } from "@pfadipuck/puck-web/ui/Navbar";
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

const resolveFileUrl: FileUrlResolver = async (fileId, size) => {
  const file = await getFile(fileId);
  if (!file) return null;
  const chain: Record<typeof size, Array<string | null | undefined>> = {
    sm: [
      file.signedThumbSmUrl,
      file.signedThumbMdUrl,
      file.signedThumbLgUrl,
      file.signedUrl,
    ],
    md: [file.signedThumbMdUrl, file.signedThumbLgUrl, file.signedUrl],
    lg: [file.signedThumbLgUrl, file.signedUrl],
    original: [file.signedUrl],
  };
  for (const url of chain[size]) if (url) return url;
  return null;
};

export default async function Page({ params }: { params: Params }) {
  await requireServerPermission({ any: ["page:create", "page:update"] });

  const { editPath = [] } = await params;
  const path = `/${editPath.join("/")}`;
  const [pageData, navbarData, footerData] = await Promise.all([
    getPage(path),
    getNavbar().catch(() => defaultNavbarData),
    getFooter().catch(() => defaultFooterDoc),
  ]);

  const navbarSlot = (
    <Navbar data={navbarData} resolveFileUrl={resolveFileUrl} />
  );

  return (
    <PageEditor
      path={path}
      data={pageData ?? defaultPageData}
      navbarSlot={navbarSlot}
      footerData={footerData}
    />
  );
}

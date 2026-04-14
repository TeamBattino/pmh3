import { NavbarRender } from "@/components/navbar/NavbarRender";
import { resolveAlbumData, resolveFileUrl } from "@/lib/file-resolver";
import { footerConfig, FooterData } from "@pfadipuck/puck-web/config/footer.config";
import { NavbarData } from "@pfadipuck/puck-web/config/navbar.config";
import { pageConfig, PageData } from "@pfadipuck/puck-web/config/page.config";
import { Render, resolveAllData } from "@puckeditor/core";

export interface PageRenderProps {
  navbarData: NavbarData;
  pageData: PageData;
  footerData: FooterData;
}

async function PageRender({
  navbarData,
  pageData,
  footerData,
}: PageRenderProps) {
  const metadata = { resolveFileUrl, resolveAlbumData };
  const resolvedPageData = (await resolveAllData(
    pageData,
    pageConfig,
    metadata
  )) as PageData;

  return (
    <>
      <NavbarRender data={navbarData} />
      <Render config={pageConfig} data={resolvedPageData} />
      <Render config={footerConfig} data={footerData} />
    </>
  );
}

export default PageRender;

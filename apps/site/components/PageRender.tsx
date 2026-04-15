import { Navbar } from "@pfadipuck/puck-web/ui/Navbar";
import { Footer } from "@pfadipuck/puck-web/ui/Footer";
import { resolveAlbumData, resolveFileUrl } from "@/lib/file-resolver";
import { resolveActivityBoard } from "@/lib/db";
import type { FooterDoc } from "@pfadipuck/puck-web/lib/footer-doc";
import { NavbarData } from "@pfadipuck/puck-web/config/navbar.config";
import { pageConfig, PageData } from "@pfadipuck/puck-web/config/page.config";
import { resolveLastTheme } from "@pfadipuck/puck-web/lib/section-theming.tsx";
import { Render, resolveAllData } from "@puckeditor/core";

export interface PageRenderProps {
  navbarData: NavbarData;
  pageData: PageData;
  footerData: FooterDoc;
}

async function PageRender({
  navbarData,
  pageData,
  footerData,
}: PageRenderProps) {
  const metadata = {
    resolveFileUrl,
    resolveAlbumData,
    resolveActivityData: resolveActivityBoard,
  };
  const resolvedPageData = (await resolveAllData(
    pageData,
    pageConfig,
    metadata
  )) as PageData;

  return (
    <>
      <Navbar data={navbarData} resolveFileUrl={resolveFileUrl} />
      <Render config={pageConfig} data={resolvedPageData} />
      <Footer data={footerData} tailTheme={resolveLastTheme(resolvedPageData)} />
    </>
  );
}

export default PageRender;

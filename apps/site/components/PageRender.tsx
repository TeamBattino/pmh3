import { NavbarRender } from "@/components/navbar/NavbarRender";
import { footerConfig, FooterData } from "@pfadipuck/puck-web/config/footer.config";
import { NavbarData } from "@pfadipuck/puck-web/config/navbar.config";
import { pageConfig, PageData } from "@pfadipuck/puck-web/config/page.config";
import { Render } from "@puckeditor/core";

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
  return (
    <>
      <NavbarRender data={navbarData} />
      <Render config={pageConfig} data={pageData} />
      <Render config={footerConfig} data={footerData} />
    </>
  );
}

export default PageRender;

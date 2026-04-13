import { NavbarItemsDesktop } from "./NavbarItemsDesktop";
import { NavbarItemsMobile } from "./NavbarItemsMobile";
import { resolveFileUrl } from "@/lib/file-resolver";
import {
  navbarConfig,
  NavbarData,
} from "@pfadipuck/puck-web/config/navbar.config";
import { Render, resolveAllData } from "@puckeditor/core";

type NavbarRenderProps = {
  data: NavbarData;
};

export async function NavbarRender({ data }: NavbarRenderProps) {
  const metadata = { resolveFileUrl };
  const resolvedData = (await resolveAllData(
    data as unknown as Parameters<typeof resolveAllData>[0],
    navbarConfig,
    metadata
  )) as NavbarData;
  const logoUrl = resolvedData.root.props?._resolvedLogoUrl;

  return (
    <nav className="bg-white sticky top-0 z-50 mud-theme">
      <NavbarItemsDesktop data={resolvedData} logoUrl={logoUrl} />
      <NavbarItemsMobile
        navbarItems={<Render config={navbarConfig} data={resolvedData} />}
        logoUrl={logoUrl}
      />
    </nav>
  );
}

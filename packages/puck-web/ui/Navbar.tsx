import { NavbarItemsDesktop } from "./NavbarItemsDesktop";
import { NavbarItemsMobile } from "./NavbarItemsMobile";
import { navbarConfig, NavbarData } from "../config/navbar.config";
import type { FileUrlResolver } from "../fields/file-picker-types";
import { Render, resolveAllData } from "@puckeditor/core";

/**
 * Renders the public site navbar from Puck navbar data. Resolves the logo
 * file URL through the caller-supplied resolver so this component stays
 * app-agnostic (the site and the admin preview plug in their own).
 */
export async function Navbar({
  data,
  resolveFileUrl,
}: {
  data: NavbarData;
  resolveFileUrl: FileUrlResolver;
}) {
  const resolvedData = (await resolveAllData(
    data as unknown as Parameters<typeof resolveAllData>[0],
    navbarConfig,
    { resolveFileUrl }
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

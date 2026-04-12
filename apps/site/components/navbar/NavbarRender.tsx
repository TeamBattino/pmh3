import { NavbarItemsDesktop } from "./NavbarItemsDesktop";
import { NavbarItemsMobile } from "./NavbarItemsMobile";
import { navbarConfig, NavbarData } from "@pfadipuck/puck-web/config/navbar.config";
import { Render } from "@puckeditor/core";

type NavbarRenderProps = {
  data: NavbarData;
};

export function NavbarRender({ data }: NavbarRenderProps) {
  return (
    <nav className="bg-white sticky top-0 z-50 mud-theme">
      <NavbarItemsDesktop data={data} />
      <NavbarItemsMobile
        navbarItems={<Render config={navbarConfig} data={data} />}
        data={data}
      />
    </nav>
  );
}

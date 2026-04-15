import { NavbarDesktopLink } from "./NavbarDesktopLink";
import { urlField } from "../../fields/url-field";
import { ComponentConfig, CustomField } from "@puckeditor/core";

export type NavbarItemProps = {
  title: string;
  url: string;
  editMode?: boolean;
};

export function NavbarItem({ title, url, editMode }: NavbarItemProps) {
  if (editMode) {
    return <NavbarItemMobile title={title} url={url} />;
  }
  return (
    <>
      <div className="hidden md:block">
        <NavbarItemDesktop title={title} url={url} />
      </div>
      <div className="md:hidden">
        <NavbarItemMobile title={title} url={url} />
      </div>
    </>
  );
}

function NavbarItemDesktop({ title, url }: NavbarItemProps) {
  return <NavbarDesktopLink href={url}>{title}</NavbarDesktopLink>;
}

function NavbarItemMobile({ title, url }: NavbarItemProps) {
  return (
    <a
      href={url || undefined}
      className="group block w-full rounded-xl border-2 border-brand-yellow/80 bg-primary px-4 py-3 text-center font-londrina text-2xl text-contrast-primary shadow-[4px_4px_0_0_var(--color-brand-yellow)] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
    >
      {title}
    </a>
  );
}

export const navbarItemConfig: ComponentConfig<NavbarItemProps> = {
  render: NavbarItem,
  fields: {
    title: {
      type: "text",
      label: "Title",
    },
    url: urlField({ label: "Link" }) as CustomField<string>,
  },
  defaultProps: {
    title: "Menu Item",
    url: "",
  },
};

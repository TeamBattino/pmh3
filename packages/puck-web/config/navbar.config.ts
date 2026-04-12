import { uploadFileField } from "../fields/upload-file";
import {
  navbarDropdownConfig,
  NavbarDropdownProps,
} from "../components/navbar/NavbarDropdown";
import {
  navbarItemConfig,
  NavbarItemProps,
} from "../components/navbar/NavbarItem";
import type { Config, Data } from "@puckeditor/core";

// @keep-sorted
export type NavbarProps = {
  NavbarDropdown: NavbarDropdownProps;
  NavbarItem: NavbarItemProps;
};
export type NavbarRootProps = {
  logo?: string;
};
export type NavbarConfig = Config<NavbarProps, NavbarRootProps>;
export type NavbarData = Data<NavbarProps, NavbarRootProps>;

export const navbarConfig: NavbarConfig = {
  root: {
    fields: {
      logo: uploadFileField,
    },
  },
  // @keep-sorted
  components: {
    NavbarDropdown: navbarDropdownConfig,
    NavbarItem: navbarItemConfig,
  },
};

export const defaultNavbarData: NavbarData = {
  content: [],
  root: {
    props: {},
  },
};

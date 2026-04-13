import { mediaField } from "../fields/media-field";
import type {
  FileUrlResolver,
  MediaRef,
} from "../fields/file-picker-types";
import {
  navbarDropdownConfig,
  NavbarDropdownProps,
} from "../components/navbar/NavbarDropdown";
import {
  navbarItemConfig,
  NavbarItemProps,
} from "../components/navbar/NavbarItem";
import type { Config, CustomField, Data } from "@puckeditor/core";

// @keep-sorted
export type NavbarProps = {
  NavbarDropdown: NavbarDropdownProps;
  NavbarItem: NavbarItemProps;
};
export type NavbarRootProps = {
  logo?: MediaRef;
  /** Populated by `resolveData` from the caller-supplied `metadata.resolveFileUrl`. Not user-editable. */
  _resolvedLogoUrl?: string;
};
export type NavbarConfig = Config<NavbarProps, NavbarRootProps>;
export type NavbarData = Data<NavbarProps, NavbarRootProps>;

export const navbarConfig: NavbarConfig = {
  root: {
    fields: {
      logo: mediaField({
        mode: "single",
        accept: ["image"],
      }) as CustomField<MediaRef | undefined>,
    },
    resolveData: async (data, { metadata }) => {
      const resolveFileUrl = (metadata as { resolveFileUrl?: FileUrlResolver })
        ?.resolveFileUrl;
      const ref = data.props?.logo;
      let resolved: string | undefined;
      if (ref && ref.type === "file" && resolveFileUrl) {
        resolved = (await resolveFileUrl(ref.fileId, "md")) ?? undefined;
      }
      return {
        ...data,
        props: { ...data.props, _resolvedLogoUrl: resolved },
      };
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

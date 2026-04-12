import { GraphicProps, graphicConfig } from "../components/Graphic";
import { HeadingProps, headingConfig } from "../components/Heading";
import { HeroProps, heroConfig } from "../components/Hero";
import { IFrameProps, iframeConfig } from "../components/IFrame";
import {
  SectionDividerProps,
  sectionDividerConfig,
} from "../components/SectionDivider";
import { TextProps, textConfig } from "../components/Text";
import {
  VerticalSpaceProps,
  verticalSpaceConfig,
} from "../components/VerticalSpace";
import { sectionThemedConfig } from "../lib/section-theming";
import type { Config, Data } from "@puckeditor/core";

// @keep-sorted
export type PageProps = {
  Graphic: GraphicProps;
  Heading: HeadingProps;
  Hero: HeroProps;
  IFrame: IFrameProps;
  SectionDivider: SectionDividerProps;
  Text: TextProps;
  VerticalSpace: VerticalSpaceProps;
};
export type PageRootProps = {
  title: string;
};
export type PageConfig = Config<PageProps, PageRootProps>;
export type PageData = Data<PageProps, PageRootProps>;

export const pageConfig: PageConfig = sectionThemedConfig({
  // @keep-sorted
  components: {
    Graphic: graphicConfig,
    Heading: headingConfig,
    Hero: heroConfig,
    IFrame: iframeConfig,
    SectionDivider: sectionDividerConfig,
    Text: textConfig,
    VerticalSpace: verticalSpaceConfig,
  },
});

export const defaultPageData: PageData = {
  content: [],
  root: {
    props: {
      title: "New Page",
    },
  },
};

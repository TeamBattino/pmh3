import {
  ButtonGroupProps,
  buttonGroupConfig,
} from "../components/ButtonGroup";
import {
  CallToActionProps,
  callToActionConfig,
} from "../components/CallToAction";
import { CardGridProps, cardGridConfig } from "../components/CardGrid";
import { CardRowProps, cardRowConfig } from "../components/CardRow";
import { ColumnsProps, columnsConfig } from "../components/Columns";
import { FAQProps, faqConfig } from "../components/FAQ";
import { GalleryProps, galleryConfig } from "../components/Gallery";
import { GraphicProps, graphicConfig } from "../components/Graphic";
import { HeadingProps, headingConfig } from "../components/Heading";
import { HeroProps, heroConfig } from "../components/Hero";
import { IconLinkProps, iconLinkConfig } from "../components/IconLink";
import { IFrameProps, iframeConfig } from "../components/IFrame";
import {
  ImageBannerProps,
  imageBannerConfig,
} from "../components/ImageBanner";
import { ImageRowProps, imageRowConfig } from "../components/ImageRow";
import { MediaBlockProps, mediaBlockConfig } from "../components/MediaBlock";
import {
  MediaWithTextProps,
  mediaWithTextConfig,
} from "../components/MediaWithText";
import { PuckCardProps, puckCardConfig } from "../components/PuckCard";
import { StepListProps, stepListConfig } from "../components/StepList";
import { TextBlockProps, textBlockConfig } from "../components/TextBlock";
import { TextProps, textConfig } from "../components/Text";
import {
  TextSectionProps,
  textSectionConfig,
} from "../components/TextSection";
import {
  SectionDividerProps,
  sectionDividerConfig,
} from "../components/SectionDivider";
import {
  VerticalSpaceProps,
  verticalSpaceConfig,
} from "../components/VerticalSpace";
import { sectionThemedConfig } from "../lib/section-theming";
import type { Config, Data } from "@puckeditor/core";

// @keep-sorted
export type PageProps = {
  ButtonGroup: ButtonGroupProps;
  CallToAction: CallToActionProps;
  Card: PuckCardProps;
  CardGrid: CardGridProps;
  CardRow: CardRowProps;
  Columns: ColumnsProps;
  FAQ: FAQProps;
  Gallery: GalleryProps;
  Graphic: GraphicProps;
  Heading: HeadingProps;
  Hero: HeroProps;
  IFrame: IFrameProps;
  IconLink: IconLinkProps;
  ImageBanner: ImageBannerProps;
  ImageRow: ImageRowProps;
  MediaBlock: MediaBlockProps;
  MediaWithText: MediaWithTextProps;
  SectionDivider: SectionDividerProps;
  StepList: StepListProps;
  Text: TextProps;
  TextBlock: TextBlockProps;
  TextSection: TextSectionProps;
  VerticalSpace: VerticalSpaceProps;
};
export type PageRootProps = {
  title: string;
};
export type PageConfig = Config<PageProps, PageRootProps>;
export type PageData = Data<PageProps, PageRootProps>;

export const pageConfig: PageConfig = sectionThemedConfig({
  categories: {
    Sections: {
      components: [
        "Hero",
        "SectionDivider",
        "Graphic",
        "TextSection",
        "ImageBanner",
        "MediaWithText",
        "CardRow",
        "StepList",
        "CallToAction",
        "FAQ",
        "ImageRow",
        "Gallery",
      ],
    },
    Layouts: {
      components: ["Columns", "CardGrid"],
    },
    Components: {
      components: ["TextBlock", "MediaBlock", "Card", "ButtonGroup", "IconLink"],
    },
    Legacy: {
      components: ["Heading", "IFrame", "Text", "VerticalSpace"],
    },
  },
  // @keep-sorted
  components: {
    ButtonGroup: buttonGroupConfig,
    CallToAction: callToActionConfig,
    Card: puckCardConfig,
    CardGrid: cardGridConfig,
    CardRow: cardRowConfig,
    Columns: columnsConfig,
    FAQ: faqConfig,
    Gallery: galleryConfig,
    Graphic: graphicConfig,
    Heading: headingConfig,
    Hero: heroConfig,
    IFrame: iframeConfig,
    IconLink: iconLinkConfig,
    ImageBanner: imageBannerConfig,
    ImageRow: imageRowConfig,
    MediaBlock: mediaBlockConfig,
    MediaWithText: mediaWithTextConfig,
    SectionDivider: sectionDividerConfig,
    StepList: stepListConfig,
    Text: textConfig,
    TextBlock: textBlockConfig,
    TextSection: textSectionConfig,
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

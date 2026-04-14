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
import { HeroProps, heroConfig } from "../components/Hero";
import { IconLinkProps, iconLinkConfig } from "../components/IconLink";
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
import {
  TextSectionProps,
  textSectionConfig,
} from "../components/TextSection";
import {
  SectionDividerProps,
  sectionDividerConfig,
} from "../components/SectionDivider";
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
  Hero: HeroProps;
  IconLink: IconLinkProps;
  ImageBanner: ImageBannerProps;
  ImageRow: ImageRowProps;
  MediaBlock: MediaBlockProps;
  MediaWithText: MediaWithTextProps;
  SectionDivider: SectionDividerProps;
  StepList: StepListProps;
  TextBlock: TextBlockProps;
  TextSection: TextSectionProps;
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
    Hero: heroConfig,
    IconLink: iconLinkConfig,
    ImageBanner: imageBannerConfig,
    ImageRow: imageRowConfig,
    MediaBlock: mediaBlockConfig,
    MediaWithText: mediaWithTextConfig,
    SectionDivider: sectionDividerConfig,
    StepList: stepListConfig,
    TextBlock: textBlockConfig,
    TextSection: textSectionConfig,
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

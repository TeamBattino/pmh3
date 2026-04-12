import ParallaxRender from "../ui/ParallaxRender";
import { ComponentConfig, WithPuckProps } from "@puckeditor/core";

type GraphicType = "parallax" | "nothing";

export type GraphicProps = {
  graphicType: GraphicType;
};

function Graphic({ editMode, graphicType }: WithPuckProps<GraphicProps>) {
  switch (graphicType) {
    case "parallax":
      return <ParallaxRender editMode={editMode} />;
    case "nothing":
      return <p>Nüüt</p>;
    default:
      if (editMode) {
        return <p>please select a type</p>;
      }
      return <></>;
  }
}
export const graphicConfig: ComponentConfig<GraphicProps> = {
  render: Graphic,
  fields: {
    graphicType: {
      type: "select",
      options: [
        { value: "nothing", label: "Nüüt" },
        { value: "parallax", label: "Parallax" },
      ],
      label: "Graphic Type",
    },
  },
};

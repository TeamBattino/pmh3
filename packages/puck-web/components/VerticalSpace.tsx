import { ComponentConfig, CustomField } from "@puckeditor/core";
import { SliderFieldRender } from "../fields/slider-field-render";

export type VerticalSpaceProps = {
  height: number;
};

function VerticalSpace({ height }: VerticalSpaceProps) {
  return <div style={{ height: `${height}px` }} />;
}

const heightSliderField: CustomField<number> = {
  type: "custom",
  label: "Height",
  render: ({ value, onChange }) => (
    <SliderFieldRender
      value={value}
      onChange={onChange}
      min={0}
      max={400}
      step={4}
      unit="px"
    />
  ),
};

export const verticalSpaceConfig: ComponentConfig<VerticalSpaceProps> = {
  label: "Vertical Space",
  render: VerticalSpace,
  fields: {
    height: heightSliderField,
  },
  defaultProps: {
    height: 48,
  },
};

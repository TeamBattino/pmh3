import { CustomField } from "@puckeditor/core";
import type { CustomFieldRenderProps } from "../lib/custom-field-types";
import { UrlFieldRender, type UrlFieldValue } from "./url-field-render";

export type { UrlFieldValue } from "./url-field-render";

export type UrlFieldOptions = {
  label?: string;
  placeholder?: string;
};

export function urlField(
  opts: UrlFieldOptions = {}
): CustomField<UrlFieldValue> {
  return {
    type: "custom",
    label: opts.label ?? "Link",
    render: (props) => (
      <UrlFieldRender
        {...(props as CustomFieldRenderProps<UrlFieldValue>)}
        placeholder={opts.placeholder}
      />
    ),
  };
}

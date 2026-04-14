import { CustomField } from "@puckeditor/core";
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
    render: ({ value, onChange }) => (
      <UrlFieldRender
        value={value}
        onChange={onChange}
        placeholder={opts.placeholder}
      />
    ),
  };
}

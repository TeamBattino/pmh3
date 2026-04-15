import type { CustomField } from "@puckeditor/core";
import type { CustomFieldRenderProps } from "../lib/custom-field-types";
import { GroupFieldRender } from "./group-field-render";

export type GroupFieldValue = string | undefined;

/**
 * Puck custom field that lets the editor pick a scout group for the
 * <GroupActivityBoard> component. The factory is server-safe; the actual
 * UI lives in `group-field-render` (a client component).
 */
export function groupField(): CustomField<GroupFieldValue> {
  return {
    type: "custom",
    label: "Group",
    render: (props) => (
      <GroupFieldRender
        {...(props as CustomFieldRenderProps<GroupFieldValue>)}
      />
    ),
  };
}

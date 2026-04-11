import { CustomField } from "@measured/puck";
import type { CustomFieldRenderProps } from "../lib/custom-field-types";
import {
  useFilePicker,
  type MediaRef,
} from "./file-picker-context";

// Inline SVGs — avoids adding `lucide-react` as a puck-web dependency.
const ImageIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
);
const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

/**
 * Puck custom field for selecting Media-pool files or whole albums.
 *
 * The pool (`media`) is fixed by the field type itself — there is no tab
 * switcher in the picker, per section 12.1 of the plan.
 */

export type MediaFieldValue = MediaRef | MediaRef[] | undefined;

export type MediaFieldOptions = {
  mode?: "single" | "multi";
  accept?: ("image" | "video")[];
  allowCollection?: boolean;
};

export function mediaField(
  opts: MediaFieldOptions = {}
): CustomField<MediaFieldValue> {
  const mode = opts.mode ?? "single";
  return {
    type: "custom",
    label: "Media",
    render: (props) => (
      <MediaFieldRender
        {...(props as CustomFieldRenderProps<MediaFieldValue>)}
        mode={mode}
        accept={opts.accept}
        allowCollection={opts.allowCollection}
      />
    ),
  };
}

function MediaFieldRender({
  value,
  onChange,
  mode,
  accept,
  allowCollection,
}: CustomFieldRenderProps<MediaFieldValue> & {
  mode: "single" | "multi";
  accept?: ("image" | "video")[];
  allowCollection?: boolean;
}) {
  const { openPicker } = useFilePicker();

  const openPickerModal = async () => {
    const selection = await openPicker({
      pool: "media",
      mode,
      accept,
      allowCollection: allowCollection ?? false,
    });
    if (!selection || selection.pool !== "media") return;
    if (mode === "single") onChange(selection.refs[0] ?? undefined);
    else onChange(selection.refs);
  };

  const refs: MediaRef[] = Array.isArray(value)
    ? value
    : value
      ? [value]
      : [];

  const removeAt = (i: number) => {
    if (mode === "single") {
      onChange(undefined);
      return;
    }
    const next = refs.slice();
    next.splice(i, 1);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      {refs.length === 0 && (
        <div className="flex min-h-16 items-center justify-center rounded-md border border-dashed border-gray-300 text-xs text-gray-500">
          No media selected
        </div>
      )}
      {refs.map((ref, i) => (
        <div
          key={`${ref.type}-${
            ref.type === "file" ? ref.fileId : ref.collectionId
          }-${i}`}
          className="flex items-center gap-2 rounded-md border border-gray-200 p-2 text-xs"
        >
          <ImageIcon className="h-4 w-4 text-gray-500" aria-hidden />
          <div className="flex-1 truncate">
            {ref.type === "file" ? (
              <span>
                File <code className="font-mono">{ref.fileId}</code>
              </span>
            ) : (
              <span>
                Album <code className="font-mono">{ref.collectionId}</code>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => removeAt(i)}
            className="rounded p-1 hover:bg-gray-100"
            aria-label="Remove"
          >
            <XIcon className="h-3 w-3" aria-hidden />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={openPickerModal}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
      >
        {refs.length === 0 ? "Select media" : "Change selection"}
      </button>
    </div>
  );
}

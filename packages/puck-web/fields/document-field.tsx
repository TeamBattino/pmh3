import { CustomField } from "@puckeditor/core";
import type { CustomFieldRenderProps } from "../lib/custom-field-types";
import {
  useFilePicker,
  type DocumentRef,
} from "./file-picker-context";

const FileTextIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M10 9H8" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
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
 * Puck custom field for selecting Documents-pool files. No folder-as-ref —
 * always resolves to a specific file id.
 */

export type DocumentFieldValue = DocumentRef | DocumentRef[] | undefined;

export type DocumentFieldOptions = {
  mode?: "single" | "multi";
  /** Optional MIME filter, e.g. `['application/pdf']`. */
  accept?: string[];
};

export function documentField(
  opts: DocumentFieldOptions = {}
): CustomField<DocumentFieldValue> {
  const mode = opts.mode ?? "single";
  return {
    type: "custom",
    label: "Document",
    render: (props) => (
      <DocumentFieldRender
        {...(props as CustomFieldRenderProps<DocumentFieldValue>)}
        mode={mode}
        accept={opts.accept}
      />
    ),
  };
}

function DocumentFieldRender({
  value,
  onChange,
  mode,
  accept,
}: CustomFieldRenderProps<DocumentFieldValue> & {
  mode: "single" | "multi";
  accept?: string[];
}) {
  const { openPicker } = useFilePicker();

  const openPickerModal = async () => {
    const selection = await openPicker({
      pool: "documents",
      mode,
      acceptMimeTypes: accept,
    });
    if (!selection || selection.pool !== "documents") return;
    if (mode === "single") onChange(selection.refs[0] ?? undefined);
    else onChange(selection.refs);
  };

  const refs: DocumentRef[] = Array.isArray(value)
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
          No document selected
        </div>
      )}
      {refs.map((ref, i) => (
        <div
          key={`${ref.fileId}-${i}`}
          className="flex items-center gap-2 rounded-md border border-gray-200 p-2 text-xs"
        >
          <FileTextIcon className="h-4 w-4 text-gray-500" aria-hidden />
          <div className="flex-1 truncate">
            <code className="font-mono">{ref.fileId}</code>
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
        {refs.length === 0 ? "Select document" : "Change selection"}
      </button>
    </div>
  );
}

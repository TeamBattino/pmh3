import { CustomField } from "@puckeditor/core";
import type { CustomFieldRenderProps } from "../lib/custom-field-types";
import { useFilePicker } from "./file-picker-context";

const FolderIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M20 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2Z" />
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

export type AlbumRef = { collectionId: string };

export type AlbumFieldValue = AlbumRef | undefined;

export function albumField(): CustomField<AlbumFieldValue> {
  return {
    type: "custom",
    label: "Album",
    render: (props) => (
      <AlbumFieldRender
        {...(props as CustomFieldRenderProps<AlbumFieldValue>)}
      />
    ),
  };
}

function AlbumFieldRender({
  value,
  onChange,
}: CustomFieldRenderProps<AlbumFieldValue>) {
  const { openPicker, useCollectionName } = useFilePicker();
  const albumName = useCollectionName(value?.collectionId);

  const open = async () => {
    const selection = await openPicker({
      pool: "media",
      mode: "single",
      albumOnly: true,
    });
    if (!selection || selection.pool !== "media") return;
    const album = selection.refs.find((r) => r.type === "collection");
    if (album && album.type === "collection") {
      onChange({ collectionId: album.collectionId });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <div className="flex items-center gap-2 rounded-md border border-gray-200 p-2 text-xs">
          <FolderIcon className="h-4 w-4 text-gray-500" aria-hidden />
          <div className="flex-1 truncate">
            {albumName ? (
              <span className="font-medium">{albumName}</span>
            ) : (
              <span className="text-gray-500">Loading album…</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="rounded p-1 hover:bg-gray-100"
            aria-label="Clear"
          >
            <XIcon className="h-3 w-3" aria-hidden />
          </button>
        </div>
      ) : (
        <div className="flex min-h-12 items-center justify-center rounded-md border border-dashed border-gray-300 text-xs text-gray-500">
          No album selected
        </div>
      )}
      <button
        type="button"
        onClick={open}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
      >
        {value ? "Change album" : "Select album"}
      </button>
    </div>
  );
}

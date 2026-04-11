import { createContext, useContext } from "react";

/**
 * Bridge between Puck custom fields in `packages/puck-web` (which must not
 * import admin-only code) and the file picker modal that lives in the admin
 * app. The admin's editor layout wraps Puck in a provider that supplies
 * `openPicker`. Fields call the context and await the promise.
 *
 * Importing from admin into puck-web would create a circular dep — hence
 * this indirection.
 */

export type MediaRef =
  | { type: "file"; fileId: string }
  | { type: "collection"; collectionId: string };

export type DocumentRef = { type: "file"; fileId: string };

export type PickerConfig = {
  pool: "media" | "documents";
  mode: "single" | "multi";
  /** Optional whitelist for media: ["image"] | ["video"] | ["image","video"]. */
  accept?: string[];
  /** Media-only: allow selecting a whole album as a reference. */
  allowCollection?: boolean;
};

export type PickerSelection =
  | { pool: "media"; refs: MediaRef[] }
  | { pool: "documents"; refs: DocumentRef[] };

export type FilePickerContextValue = {
  openPicker: (config: PickerConfig) => Promise<PickerSelection | null>;
};

const notWired: FilePickerContextValue = {
  openPicker: async () => {
    throw new Error(
      "FilePickerProvider is not mounted — the Puck editor layout must " +
        "wrap children in <FilePickerProvider> before rendering fields that " +
        "call openPicker()."
    );
  },
};

export const FilePickerContext =
  createContext<FilePickerContextValue>(notWired);

export function useFilePicker(): FilePickerContextValue {
  return useContext(FilePickerContext);
}

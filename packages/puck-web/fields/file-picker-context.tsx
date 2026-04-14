"use client";

import { createContext, useContext } from "react";
import type { PickerConfig, PickerSelection } from "./file-picker-types";

export type {
  MediaRef,
  DocumentRef,
  PickerConfig,
  PickerSelection,
} from "./file-picker-types";

/**
 * Bridge between Puck custom fields in `packages/puck-web` (which must not
 * import admin-only code) and the file picker modal that lives in the admin
 * app. The admin's editor layout wraps Puck in a provider that supplies
 * `openPicker`. Fields call the context and await the promise.
 */

export type FilePickerContextValue = {
  openPicker: (config: PickerConfig) => Promise<PickerSelection | null>;
  /** Resolve an album / album collection title from its id. Returns null
   *  while loading or if unknown. Used for human-readable field previews. */
  useCollectionName: (collectionId: string | null | undefined) => string | null;
  /** Resolve a file's display name from its id. Returns null while loading
   *  or if unknown. */
  useFileName: (fileId: string | null | undefined) => string | null;
};

const notWired: FilePickerContextValue = {
  openPicker: async () => {
    throw new Error(
      "FilePickerProvider is not mounted — the Puck editor layout must " +
        "wrap children in <FilePickerProvider> before rendering fields that " +
        "call openPicker()."
    );
  },
  useCollectionName: () => null,
  useFileName: () => null,
};

export const FilePickerContext =
  createContext<FilePickerContextValue>(notWired);

export function useFilePicker(): FilePickerContextValue {
  return useContext(FilePickerContext);
}

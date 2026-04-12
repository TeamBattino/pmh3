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

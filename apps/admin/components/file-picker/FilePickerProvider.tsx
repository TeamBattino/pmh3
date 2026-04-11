"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import {
  FilePickerContext,
  type FilePickerContextValue,
  type PickerConfig,
  type PickerSelection,
} from "@pfadipuck/puck-web/fields/file-picker-context";
import { FilePickerModal } from "./FilePickerModal";

/**
 * Supplies `openPicker()` to the `mediaField` / `documentField` custom
 * fields. Wraps the Puck editor in the admin's editor layout.
 *
 * `openPicker` returns a promise that resolves to the user's selection
 * (or null on cancel) — fields await it and commit via `onChange`.
 */
export function FilePickerProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PickerConfig | null>(null);
  const resolverRef = useRef<
    ((selection: PickerSelection | null) => void) | null
  >(null);

  const openPicker = useCallback<FilePickerContextValue["openPicker"]>(
    (nextConfig) => {
      setConfig(nextConfig);
      return new Promise((resolve) => {
        resolverRef.current = resolve;
      });
    },
    []
  );

  const onCancel = useCallback(() => {
    resolverRef.current?.(null);
    resolverRef.current = null;
    setConfig(null);
  }, []);

  const onConfirm = useCallback((selection: PickerSelection) => {
    resolverRef.current?.(selection);
    resolverRef.current = null;
    setConfig(null);
  }, []);

  const value = useMemo<FilePickerContextValue>(
    () => ({ openPicker }),
    [openPicker]
  );

  return (
    <FilePickerContext.Provider value={value}>
      {children}
      <FilePickerModal
        open={!!config}
        config={config}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    </FilePickerContext.Provider>
  );
}

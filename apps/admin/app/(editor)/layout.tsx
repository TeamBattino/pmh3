import { FilePickerProvider } from "@/components/file-picker/FilePickerProvider";

/**
 * Wraps every route under `(editor)` in the `FilePickerProvider` so the new
 * `mediaField` / `documentField` Puck custom fields can call `openPicker()`
 * without having to register the provider at every individual page.
 *
 * Sits above the editor pages but below the root `Providers` wrapper that
 * already supplies SessionProvider + QueryClient + BackgroundOpsProvider.
 */
export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <FilePickerProvider>{children}</FilePickerProvider>;
}

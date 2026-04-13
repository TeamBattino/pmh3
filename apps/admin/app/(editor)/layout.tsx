import { FilePickerProvider } from "@/components/file-picker/FilePickerProvider";
import { getAllPaths } from "@/lib/db/db-actions";
import { PagePathsProvider } from "@pfadipuck/puck-web/fields/page-paths-context";

/**
 * Wraps every route under `(editor)` in the providers the Puck custom fields
 * need: `FilePickerProvider` for the media/document picker, and
 * `PagePathsProvider` so `urlField()` can list existing pages in its picker.
 *
 * Sits above the editor pages but below the root `Providers` wrapper that
 * already supplies SessionProvider + QueryClient + BackgroundOpsProvider.
 */
export default async function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pagePaths = await getAllPaths();
  return (
    <PagePathsProvider pagePaths={pagePaths}>
      <FilePickerProvider>{children}</FilePickerProvider>
    </PagePathsProvider>
  );
}

"use client";
import PageHeaderActions from "@/components/puck-overrides/PageHeaderActions";
import PuckHeader from "@/components/puck-overrides/PuckHeader";
import { PageConfig, pageConfig, PageData } from "@pfadipuck/puck-web/config/page.config";
import { getFile } from "@/lib/db/file-system-actions";
import { resolveAlbumDataAdmin } from "@/lib/files/resolve-album-admin";
import { resolveActivityBoardForEditor } from "@/lib/activities/actions";
import type { FileUrlResolver } from "@pfadipuck/puck-web/fields/file-picker-types";
import type { FooterDoc } from "@pfadipuck/puck-web/lib/footer-doc";
import { Footer } from "@pfadipuck/puck-web/ui/Footer";
import { resolveLastTheme } from "@pfadipuck/puck-web/lib/section-theming.tsx";
import { Button } from "@/components/ui/Button";
import { Puck, usePuck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { ReactNode, useMemo, useState } from "react";

type HeaderTitleProps = {
  path: string;
};

function HeaderTitle({ path }: HeaderTitleProps) {
  const {
    appState: { data },
  } = usePuck<PageConfig>();
  const title = data?.root?.props?.title;
  return `Editing ${path}${title ? `: ${title}` : ""}`;
}

type PageEditorProps = {
  path: string;
  data: PageData;
  navbarSlot: ReactNode;
  footerData: FooterDoc;
};

function EditorFooter({ data }: { data: FooterDoc }) {
  const {
    appState: { data: pageData },
  } = usePuck<PageConfig>();
  const tailTheme = resolveLastTheme(pageData);
  return <Footer data={data} tailTheme={tailTheme} />;
}

export function PageEditor({
  path,
  data,
  navbarSlot,
  footerData,
}: PageEditorProps) {
  const metadata = useMemo(
    () => ({
      resolveFileUrl: (async (fileId, size) => {
        const file = await getFile(fileId);
        if (!file) return null;
        // Fallback chain: requested → next larger → ... → original.
        const chain: Record<typeof size, Array<string | null | undefined>> = {
          sm: [
            file.signedThumbSmUrl,
            file.signedThumbMdUrl,
            file.signedThumbLgUrl,
            file.signedUrl,
          ],
          md: [
            file.signedThumbMdUrl,
            file.signedThumbLgUrl,
            file.signedUrl,
          ],
          lg: [file.signedThumbLgUrl, file.signedUrl],
          original: [file.signedUrl],
        };
        for (const url of chain[size]) if (url) return url;
        return null;
      }) satisfies FileUrlResolver,
      resolveAlbumData: resolveAlbumDataAdmin,
      resolveActivityData: resolveActivityBoardForEditor,
    }),
    []
  );

  const [showChrome, setShowChrome] = useState(true);

  const editorConfig = useMemo<PageConfig>(() => {
    const OriginalRootRender = pageConfig.root!.render!;
    return {
      ...pageConfig,
      root: {
        ...pageConfig.root,
        render: (props) =>
          showChrome ? (
            <div className="flex min-h-screen flex-col">
              <div className="pointer-events-none select-none" aria-hidden>
                {navbarSlot}
              </div>
              <div className="flex-1">
                <OriginalRootRender {...props} />
              </div>
              <div className="pointer-events-none select-none" aria-hidden>
                <EditorFooter data={footerData} />
              </div>
            </div>
          ) : (
            <OriginalRootRender {...props} />
          ),
      },
    };
  }, [navbarSlot, footerData, showChrome]);

  return (
    <Puck
      config={editorConfig}
      data={data}
      headerPath={path}
      iframe={{ enabled: true }}
      metadata={metadata}
      overrides={{
        header: () => (
          <PuckHeader
            headerTitle={<HeaderTitle path={path} />}
            headerActions={
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
                <Button
                  onClick={() => setShowChrome((v) => !v)}
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  title={
                    showChrome
                      ? "Hide navbar and footer preview"
                      : "Show navbar and footer preview"
                  }
                >
                  {showChrome ? "Hide Chrome" : "Show Chrome"}
                </Button>
                <PageHeaderActions path={path} />
              </div>
            }
          />
        ),
      }}
    />
  );
}

"use client";
import PageHeaderActions from "@/components/puck-overrides/PageHeaderActions";
import PuckHeader from "@/components/puck-overrides/PuckHeader";
import { PageConfig, pageConfig, PageData } from "@pfadipuck/puck-web/config/page.config";
import { getFile } from "@/lib/db/file-system-actions";
import type { FileUrlResolver } from "@pfadipuck/puck-web/fields/file-picker-types";
import { Puck, usePuck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { useMemo } from "react";

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
};

export function PageEditor({ path, data }: PageEditorProps) {
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
    }),
    []
  );

  return (
    <Puck
      config={pageConfig}
      data={data}
      headerPath={path}
      iframe={{ enabled: true }}
      metadata={metadata}
      overrides={{
        header: () => (
          <PuckHeader
            headerTitle={<HeaderTitle path={path} />}
            headerActions={<PageHeaderActions path={path} />}
          />
        ),
      }}
    />
  );
}

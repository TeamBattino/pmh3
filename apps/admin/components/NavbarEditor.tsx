"use client";
import OtherHeaderActions from "@/components/puck-overrides/OtherHeaderActions";
import PuckHeader from "@/components/puck-overrides/PuckHeader";
import {
  NavbarConfig,
  navbarConfig,
  NavbarData,
} from "@pfadipuck/puck-web/config/navbar.config";
import { getFile } from "@/lib/db/file-system-actions";
import { saveNavbar } from "@/lib/db/db-actions";
import type { FileUrlResolver } from "@pfadipuck/puck-web/fields/file-picker-types";
import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { type PropsWithChildren, type ReactNode, useMemo } from "react";

function PreviewRoot({ children }: PropsWithChildren) {
  return <div className="mud-theme bg-ground font-poppins">{children}</div>;
}

export function NavbarEditor({ data }: { data: NavbarData }) {
  const metadata = useMemo(
    () => ({
      resolveFileUrl: (async (fileId, size) => {
        const file = await getFile(fileId);
        if (!file) return null;
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
      config={{
        ...navbarConfig,
        root: {
          ...navbarConfig.root,
          render: ({ children }: { children: ReactNode }) => (
            <PreviewRoot>{children}</PreviewRoot>
          ),
        },
      }}
      data={data}
      iframe={{ enabled: true }}
      metadata={metadata}
      overrides={{
        header: () => (
          <PuckHeader
            headerTitle="Editing Navbar"
            headerActions={
              <OtherHeaderActions<NavbarConfig> saveData={saveNavbar} />
            }
          />
        ),
      }}
    />
  );
}

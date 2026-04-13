"use client";
import OtherHeaderActions from "@/components/puck-overrides/OtherHeaderActions";
import PuckHeader from "@/components/puck-overrides/PuckHeader";
import {
  NavbarConfig,
  navbarConfig,
  NavbarData,
  NavbarRootProps,
} from "@pfadipuck/puck-web/config/navbar.config";
import { getFile } from "@/lib/db/file-system-actions";
import { saveNavbar } from "@/lib/db/db-actions";
import type { FileUrlResolver } from "@pfadipuck/puck-web/fields/file-picker-types";
import { NavbarHamburgerSvg } from "@pfadipuck/graphics/NavbarHamburgerSvg";
import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { type ReactNode, useMemo } from "react";

type NavbarPreviewRootProps = {
  children: ReactNode;
  _resolvedLogoUrl?: string;
};

function NavbarPreviewRoot({
  children,
  _resolvedLogoUrl,
}: NavbarPreviewRootProps) {
  return (
    <div className="mud-theme font-poppins min-h-full">
      <div className="bg-white">
        <div className="grid grid-cols-[1fr_min-content_1fr] border-b-[#edc600] border-b-8">
          <div />
          <div className="relative w-28 h-28 mb-[-50px]">
            <a className="block rounded-full overflow-hidden w-full h-full border border-contrast-ground/10">
              {_resolvedLogoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={_resolvedLogoUrl}
                  alt="Logo preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-elevated flex items-center justify-center text-[10px] text-contrast-ground/60 text-center px-2">
                  No logo selected
                </div>
              )}
            </a>
          </div>
          <div className="flex items-center justify-end">
            <div className="text-gray-500 w-10 h-10 relative mr-5 border rounded-full border-dashed">
              <NavbarHamburgerSvg open={true} />
            </div>
          </div>
        </div>
        <div className="bg-[rgba(0,0,0,0.6)] py-16 px-2 min-h-[60vh]">
          <div className="flex flex-col gap-3">{children}</div>
        </div>
      </div>
    </div>
  );
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
          render: ({
            children,
            _resolvedLogoUrl,
          }: NavbarRootProps & { children: ReactNode }) => (
            <NavbarPreviewRoot _resolvedLogoUrl={_resolvedLogoUrl}>
              {children}
            </NavbarPreviewRoot>
          ),
        },
      }}
      data={data}
      iframe={{ enabled: true }}
      metadata={metadata}
      viewports={[
        { width: 360, height: "auto", icon: "Smartphone", label: "Mobile" },
      ]}
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

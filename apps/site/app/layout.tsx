import cn from "@pfadipuck/puck-web/lib/cn";
import { poppins, rockingsodaPlus } from "@/lib/fonts";
import { Providers } from "@/components/Providers";
import { getNavbar } from "@/lib/db";
import { resolveFileUrl } from "@/lib/file-resolver";
import { navbarConfig } from "@pfadipuck/puck-web/config/navbar.config";
import type { NavbarData } from "@pfadipuck/puck-web/config/navbar.config";
import { resolveAllData } from "@puckeditor/core";
import type { Metadata } from "next";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const navbarData = await getNavbar();
    const resolved = (await resolveAllData(
      navbarData as unknown as Parameters<typeof resolveAllData>[0],
      navbarConfig,
      { resolveFileUrl }
    )) as NavbarData;
    const logoUrl = resolved.root.props?._resolvedLogoUrl;
    if (!logoUrl) return {};
    return { icons: { icon: logoUrl } };
  } catch {
    return {};
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={cn(
          rockingsodaPlus.variable,
          poppins.variable,
          "font-poppins bg-ground mud-theme"
        )}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

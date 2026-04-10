"use client";
import OtherHeaderActions from "@/components/puck-overrides/OtherHeaderActions";
import PuckHeader from "@/components/puck-overrides/PuckHeader";
import {
  NavbarConfig,
  navbarConfig,
  NavbarData,
} from "@pfadipuck/puck-web/config/navbar.config";
import { saveNavbar } from "@/lib/db/db-actions";
import { Puck } from "@measured/puck";
import "@measured/puck/puck.css";
import { type PropsWithChildren } from "react";

function PreviewRoot({ children }: PropsWithChildren) {
  return <div className="mud-theme bg-ground font-poppins">{children}</div>;
}

export function NavbarEditor({ data }: { data: NavbarData }) {
  return (
    <Puck
      config={{
        ...navbarConfig,
        root: {
          ...navbarConfig.root,
          render: ({ children }) => <PreviewRoot>{children}</PreviewRoot>,
        },
      }}
      data={data}
      iframe={{ enabled: true }}
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

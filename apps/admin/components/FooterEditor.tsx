"use client";
import OtherHeaderActions from "@/components/puck-overrides/OtherHeaderActions";
import PuckHeader from "@/components/puck-overrides/PuckHeader";
import {
  FooterConfig,
  footerConfig,
  FooterData,
} from "@pfadipuck/puck-web/config/footer.config";
import { saveFooter } from "@/lib/db/db-actions";
import { Puck } from "@measured/puck";
import "@measured/puck/puck.css";
import { type PropsWithChildren } from "react";

function PreviewRoot({ children }: PropsWithChildren) {
  return <div className="mud-theme bg-ground font-poppins">{children}</div>;
}

export function FooterEditor({ data }: { data: FooterData }) {
  return (
    <Puck
      config={{
        ...footerConfig,
        root: {
          ...footerConfig.root,
          render: ({ children }) => <PreviewRoot>{children}</PreviewRoot>,
        },
      }}
      data={data}
      iframe={{ enabled: true }}
      overrides={{
        header: () => (
          <PuckHeader
            headerTitle="Editing Footer"
            headerActions={
              <OtherHeaderActions<FooterConfig> saveData={saveFooter} />
            }
          />
        ),
      }}
    />
  );
}

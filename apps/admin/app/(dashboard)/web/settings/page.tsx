import { FooterSettingsForm } from "@/components/settings/FooterSettingsForm";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { getAllPaths, getFooter } from "@/lib/db/db-actions";
import { requireServerPermission } from "@/lib/security/server-guard";
import { PagePathsProvider } from "@pfadipuck/puck-web/fields/page-paths-context";
import { LayoutPanelTop, PanelBottom } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Web Settings" };
}

export default async function Page() {
  await requireServerPermission({ all: ["web:update"] });

  const [footer, pagePaths] = await Promise.all([
    getFooter(),
    getAllPaths(),
  ]);

  return (
    <PagePathsProvider pagePaths={pagePaths}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Web Settings</h1>
          <p className="text-sm text-muted-foreground">
            Global configuration shared across every page of the site.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutPanelTop className="size-4" />
              Navbar
            </CardTitle>
            <CardDescription>
              Site logo and top-level navigation. Edited in a dedicated editor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/web/navbar">Open navbar editor</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-1">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <PanelBottom className="size-4" />
            Footer
          </h2>
          <p className="text-sm text-muted-foreground">
            Link columns and legal row shown at the bottom of every page.
          </p>
        </div>
        <FooterSettingsForm initial={footer} />
      </div>
    </PagePathsProvider>
  );
}

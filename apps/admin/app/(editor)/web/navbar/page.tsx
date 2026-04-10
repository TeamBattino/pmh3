import { NavbarEditor } from "@/components/NavbarEditor";
import { getNavbar } from "@/lib/db/db-actions";
import { requireServerPermission } from "@/lib/security/server-guard";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Navbar Editor",
  };
}

export default async function Page() {
  await requireServerPermission({ all: ["navbar:update"] });

  const data = await getNavbar();

  return <NavbarEditor data={data} />;
}

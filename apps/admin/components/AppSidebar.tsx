"use client";

import {
  FileText,
  Home,
  LayoutPanelTop,
  PanelBottom,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

import { PermissionGuard } from "@/components/security/PermissionGuard";
import { Button } from "@/components/ui/Button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/Sidebar";
import type { Policy } from "@/lib/security/permission-evaluator";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  policy?: Policy;
  isActive?: (pathname: string) => boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const groups: NavGroup[] = [
  {
    label: "Web CMS",
    items: [
      {
        href: "/web",
        label: "Pages",
        icon: FileText,
        policy: { all: ["admin-ui:read"] },
        isActive: (p) => p === "/web" || p.startsWith("/web/editor"),
      },
      {
        href: "/web/navbar",
        label: "Navbar",
        icon: LayoutPanelTop,
        policy: { all: ["navbar:update"] },
        isActive: (p) => p === "/web/navbar",
      },
      {
        href: "/web/footer",
        label: "Footer",
        icon: PanelBottom,
        policy: { all: ["footer:update"] },
        isActive: (p) => p === "/web/footer",
      },
    ],
  },
  {
    label: "Security",
    items: [
      {
        href: "/security",
        label: "Roles",
        icon: ShieldCheck,
        policy: { all: ["role-permissions:read"] },
        isActive: (p) => p.startsWith("/security"),
      },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Pfadi Admin">
              <Link href="/">
                <Home className="size-4" />
                <span className="truncate font-semibold">Pfadi Admin</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.isActive
                    ? item.isActive(pathname ?? "")
                    : pathname === item.href;
                  const content = (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                        <Link href={item.href}>
                          <Icon className="size-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                  return item.policy ? (
                    <PermissionGuard key={item.href} policy={item.policy}>
                      {content}
                    </PermissionGuard>
                  ) : (
                    content
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        {session?.user && (
          <div className="flex flex-col gap-2 px-2 py-1.5 text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
            <div className="truncate font-medium text-sidebar-foreground">
              {session.user.name ?? session.user.email ?? "User"}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Sign out
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

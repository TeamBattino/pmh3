"use client";

import { Button } from "@/components/ui/Button";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Table,
} from "@/components/ui/Table";
import { getSecurityConfig } from "@/lib/db/db-actions";
import { useHasPermission } from "@/lib/security/hooks/has-permission";
import type { Role } from "@/lib/security/security-config";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { PermissionsModal } from "./PermissionsModal";
import { ServiceAccessModal } from "./ServiceAccessModal";

type SubTab = "admin" | "services";

export function PermissionsManager() {
  const [activeTab, setActiveTab] = useState<SubTab>("admin");
  const canEdit = useHasPermission({ any: ["role-permissions:update"] });

  const { data: config, isLoading } = useQuery({
    queryKey: ["securityConfig"],
    queryFn: getSecurityConfig,
  });

  const roles = config?.roles ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Permissions</h2>
        <p className="text-sm text-muted-foreground">
          Configure what each role can do and which services it can access.
        </p>
      </div>

      {/* Sub-tab bar */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("admin")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === "admin"
              ? "border-admin-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          )}
        >
          Admin Permissions
        </button>
        <button
          onClick={() => setActiveTab("services")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === "services"
              ? "border-admin-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          )}
        >
          Service Access
        </button>
      </div>

      {activeTab === "admin" ? (
        <AdminPermissionsTable
          roles={roles}
          isLoading={isLoading}
          canEdit={canEdit}
        />
      ) : (
        <ServiceAccessTable
          roles={roles}
          isLoading={isLoading}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}

function AdminPermissionsTable({
  roles,
  isLoading,
  canEdit,
}: {
  roles: Role[];
  isLoading: boolean;
  canEdit: boolean;
}) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[200px]">Role</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead className="text-right w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={3}
                className="h-32 text-center animate-pulse text-muted-foreground"
              >
                Loading...
              </TableCell>
            </TableRow>
          ) : roles.length > 0 ? (
            roles.map((role) => (
              <TableRow key={role.name}>
                <TableCell className="font-semibold">{role.name}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(role.permissions ?? []).length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">
                        None
                      </span>
                    ) : (
                      (role.permissions ?? []).map((p) => (
                        <span
                          key={p}
                          className="inline-block rounded bg-muted px-2 py-0.5 text-xs font-mono"
                        >
                          {p}
                        </span>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <PermissionsModal
                    role={role}
                    canEdit={canEdit}
                    trigger={
                      <Button
                        variant={canEdit ? "default" : "secondary"}
                        size="sm"
                      >
                        {canEdit ? "Edit" : "View"}
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={3}
                className="h-32 text-center text-muted-foreground italic"
              >
                No roles defined. Create roles in the Roles tab first.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ServiceAccessTable({
  roles,
  isLoading,
  canEdit,
}: {
  roles: Role[];
  isLoading: boolean;
  canEdit: boolean;
}) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[200px]">Role</TableHead>
            <TableHead>Allowed Services</TableHead>
            <TableHead className="text-right w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={3}
                className="h-32 text-center animate-pulse text-muted-foreground"
              >
                Loading...
              </TableCell>
            </TableRow>
          ) : roles.length > 0 ? (
            roles.map((role) => (
              <TableRow key={role.name}>
                <TableCell className="font-semibold">{role.name}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(role.allowedClients ?? []).length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">
                        None
                      </span>
                    ) : (
                      (role.allowedClients ?? []).map((c) => (
                        <span
                          key={c}
                          className="inline-block rounded bg-muted px-2 py-0.5 text-xs font-mono"
                        >
                          {c}
                        </span>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <ServiceAccessModal
                    role={role}
                    canEdit={canEdit}
                    trigger={
                      <Button
                        variant={canEdit ? "default" : "secondary"}
                        size="sm"
                      >
                        {canEdit ? "Edit" : "View"}
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={3}
                className="h-32 text-center text-muted-foreground italic"
              >
                No roles defined. Create roles in the Roles tab first.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

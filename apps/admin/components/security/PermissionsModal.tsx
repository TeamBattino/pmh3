"use client";

import { Button } from "@/components/ui/Button";
import {
  DialogContent,
  DialogFooter,
  DialogClose,
  Dialog,
  DialogTitle,
  DialogTrigger,
  DialogHeader,
} from "@/components/ui/Dialog";
import { Label } from "@/components/ui/Label";
import { toast } from "@/components/ui/Sonner";
import { getSecurityConfig, saveSecurityConfig } from "@/lib/db/db-actions";
import { queryClient } from "@/lib/query-client";
import type { Permission, Role } from "@/lib/security/security-config";
import { useState } from "react";

interface PermissionsModalProps {
  role: Role;
  canEdit: boolean;
  trigger: React.ReactNode;
}

const permissionGroups = {
  System: ["admin-ui:read"],
  Content: ["page:create", "page:update", "page:delete"],
  Assets: ["asset:create", "asset:update", "asset:delete", "asset:read"],
  Roles: ["role-permissions:read", "role-permissions:update"],
  Navigation: ["navbar:update", "footer:update"],
  "OAuth Clients": ["oauth-clients:manage"],
  Global: ["global-admin"],
} as const;

export function PermissionsModal({
  role: initialRole,
  canEdit,
  trigger,
}: PermissionsModalProps) {
  const [open, setOpen] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>(
    initialRole.permissions ?? []
  );

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) setPermissions(initialRole.permissions ?? []);
  };

  const handleToggle = (permission: Permission, checked: boolean) => {
    setPermissions((prev) =>
      checked ? [...prev, permission] : prev.filter((p) => p !== permission)
    );
  };

  const handleToggleGroup = (perms: Permission[], checked: boolean) => {
    setPermissions((prev) => {
      if (checked) {
        const added = new Set([...prev, ...perms]);
        return Array.from(added) as Permission[];
      }
      return prev.filter((p) => !perms.includes(p));
    });
  };

  const handleSave = async () => {
    try {
      const config = await getSecurityConfig();
      const idx = config.roles.findIndex((r) => r.name === initialRole.name);
      if (idx === -1) {
        toast.error("Role not found");
        return;
      }
      config.roles[idx] = { ...config.roles[idx], permissions };
      await saveSecurityConfig(config);
      queryClient.invalidateQueries({ queryKey: ["securityConfig"] });
      setOpen(false);
      toast.success("Permissions updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save permissions");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {canEdit ? "Edit" : "View"} Permissions — {initialRole.name}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
            {Object.entries(permissionGroups).map(([group, perms]) => {
              const allSelected = perms.every((p) =>
                permissions.includes(p as Permission)
              );
              const someSelected = perms.some((p) =>
                permissions.includes(p as Permission)
              );

              return (
                <div key={group} className="flex flex-col gap-2">
                  <div className="flex justify-between items-center bg-muted px-3 py-1.5 rounded-t-lg border-b">
                    <span className="font-semibold">{group}</span>
                    {canEdit && (
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold uppercase text-muted-foreground hover:text-foreground transition-colors">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => {
                            if (el)
                              el.indeterminate = someSelected && !allSelected;
                          }}
                          onChange={(e) =>
                            handleToggleGroup(
                              perms as unknown as Permission[],
                              e.target.checked
                            )
                          }
                          className="h-3 w-3 rounded border-input"
                        />
                        Select All
                      </label>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {perms.map((permission) => (
                      <label
                        key={permission}
                        className="flex items-center gap-2.5 rounded-md bg-muted/50 p-2 px-3 border hover:bg-accent transition-colors cursor-pointer data-[disabled=true]:cursor-default data-[disabled=true]:opacity-70"
                        data-disabled={!canEdit}
                      >
                        <input
                          type="checkbox"
                          disabled={!canEdit}
                          checked={permissions.includes(permission as Permission)}
                          onChange={(e) =>
                            handleToggle(
                              permission as Permission,
                              e.target.checked
                            )
                          }
                          className="h-3.5 w-3.5 rounded border-input disabled:cursor-not-allowed"
                        />
                        <span className="text-sm truncate">{permission}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">{canEdit ? "Cancel" : "Close"}</Button>
          </DialogClose>
          {canEdit && <Button onClick={handleSave}>Save</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

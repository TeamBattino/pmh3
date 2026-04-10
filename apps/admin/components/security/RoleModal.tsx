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
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { toast } from "@/components/ui/Sonner";
import { getSecurityConfig, saveSecurityConfig } from "@/lib/db/db-actions";
import { queryClient } from "@/lib/query-client";
import type { Permission, Role } from "@/lib/security/security-config";
import { useEffect, useState } from "react";

interface PermissionModalProps {
  role?: Role;
  mode: "add" | "edit" | "view";
  trigger: React.ReactNode;
}

const MODE_CONFIG = {
  add: {
    title: "Creator",
    isReadOnly: false,
    cancelLabel: "Cancel",
    showSave: true,
  },
  edit: {
    title: "Editor",
    isReadOnly: false,
    cancelLabel: "Cancel",
    showSave: true,
  },
  view: {
    title: "Viewer",
    isReadOnly: true,
    cancelLabel: "Close",
    showSave: false,
  },
} as const;

export function RoleModal({
  role: initialRole,
  mode,
  trigger,
}: PermissionModalProps) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>(
    initialRole || { name: "", description: "", permissions: [] }
  );

  const config = MODE_CONFIG[mode];

  useEffect(() => {
    if (open) {
      setRole(initialRole || { name: "", description: "", permissions: [] });
    }
  }, [open, initialRole]);

  const handlePermissionChange = (permission: Permission, checked: boolean) => {
    setRole((prev) => {
      const newPermissions = checked
        ? [...prev.permissions, permission]
        : prev.permissions.filter((p) => p !== permission);
      return { ...prev, permissions: newPermissions };
    });
  };

  const handleSave = async () => {
    try {
      const securityConfig = await getSecurityConfig();
      const existingIndex = securityConfig.roles.findIndex(
        (r) => r.name === role.name
      );

      if (existingIndex > -1) {
        securityConfig.roles[existingIndex] = role;
      } else {
        securityConfig.roles.push(role);
      }

      await saveSecurityConfig(securityConfig);
      queryClient.invalidateQueries({ queryKey: ["securityConfig"] });
      setOpen(false);
      toast.success("Role saved successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save role");
    }
  };

  const permissionGroups = {
    System: ["admin-ui:read"],
    Content: ["page:create", "page:update", "page:delete"],
    Assets: ["asset:create", "asset:update", "asset:delete"],
    Roles: ["role-permissions:read", "role-permissions:update"],
    Navigation: ["navbar:update", "footer:update"],
    Global: ["global-admin"],
  } as const;

  const toggleGroup = (permissions: Permission[], checked: boolean) => {
    setRole((prev) => {
      let newPermissions = [...prev.permissions];
      if (checked) {
        permissions.forEach((p) => {
          if (!newPermissions.includes(p)) newPermissions.push(p);
        });
      } else {
        newPermissions = newPermissions.filter((p) => !permissions.includes(p));
      }
      return { ...prev, permissions: newPermissions };
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Role {config.title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Role Name
              </Label>
              <Input
                disabled={config.isReadOnly}
                value={role.name}
                onChange={(e) =>
                  setRole((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="OFI-Leiter"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Description
              </Label>
              <Input
                disabled={config.isReadOnly}
                value={role.description}
                onChange={(e) =>
                  setRole((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Description"
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Label className="text-xs font-semibold uppercase text-muted-foreground border-b pb-1">
              Permissions
            </Label>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
              {Object.entries(permissionGroups).map(([group, permissions]) => {
                const allSelected = permissions.every((p) =>
                  role.permissions.includes(p as Permission)
                );
                const someSelected = permissions.some((p) =>
                  role.permissions.includes(p as Permission)
                );

                return (
                  <div key={group} className="flex flex-col gap-2">
                    <div className="flex justify-between items-center bg-muted px-3 py-1.5 rounded-t-lg border-b">
                      <span className="font-semibold">{group}</span>
                      {!config.isReadOnly && (
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold uppercase text-muted-foreground hover:text-foreground transition-colors">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(el) => {
                              if (el)
                                el.indeterminate =
                                  someSelected && !allSelected;
                            }}
                            onChange={(e) =>
                              toggleGroup(
                                permissions as unknown as Permission[],
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
                      {permissions.map((permission) => {
                        const isAssigned = role.permissions.includes(
                          permission as Permission
                        );
                        return (
                          <label
                            key={permission}
                            className="flex items-center gap-2.5 rounded-md bg-muted/50 p-2 px-3 border hover:bg-accent transition-colors cursor-pointer data-[disabled=true]:cursor-default data-[disabled=true]:opacity-70"
                            data-disabled={config.isReadOnly}
                          >
                            <input
                              type="checkbox"
                              disabled={config.isReadOnly}
                              checked={isAssigned}
                              onChange={(e) =>
                                handlePermissionChange(
                                  permission as Permission,
                                  e.target.checked
                                )
                              }
                              className="h-3.5 w-3.5 rounded border-input disabled:cursor-not-allowed"
                            />
                            <span className="text-sm truncate">
                              {permission}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">{config.cancelLabel}</Button>
          </DialogClose>
          {config.showSave && (
            <Button onClick={handleSave}>
              Confirm
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

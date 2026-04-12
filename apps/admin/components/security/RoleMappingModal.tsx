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
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { toast } from "@/components/ui/Sonner";
import { getSecurityConfig, saveSecurityConfig } from "@/lib/db/db-actions";
import { queryClient } from "@/lib/query-client";
import type { Role, MidataGroupMapping } from "@/lib/security/security-config";
import { useState } from "react";
import { Plus, X } from "lucide-react";

interface RoleMappingModalProps {
  role?: Role;
  mode: "add" | "edit" | "view";
  trigger: React.ReactNode;
}

const emptyRole: Role = {
  name: "",
  description: "",
  permissions: [],
  midataGroupMappings: [],
  allowedClients: [],
};

function withDefaults(role?: Role): Role {
  if (!role) return emptyRole;
  return {
    ...emptyRole,
    ...role,
    midataGroupMappings: role.midataGroupMappings ?? [],
    allowedClients: role.allowedClients ?? [],
  };
}

export function RoleMappingModal({
  role: initialRole,
  mode,
  trigger,
}: RoleMappingModalProps) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>(withDefaults(initialRole));
  const isReadOnly = mode === "view";

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) setRole(withDefaults(initialRole));
  };

  const handleAddMapping = () => {
    setRole((prev) => ({
      ...prev,
      midataGroupMappings: [
        ...prev.midataGroupMappings,
        { groupId: 0, roleClasses: [] },
      ],
    }));
  };

  const handleRemoveMapping = (index: number) => {
    setRole((prev) => ({
      ...prev,
      midataGroupMappings: prev.midataGroupMappings.filter(
        (_, i) => i !== index
      ),
    }));
  };

  const handleMappingGroupIdChange = (index: number, value: string) => {
    const groupId = parseInt(value, 10);
    setRole((prev) => ({
      ...prev,
      midataGroupMappings: prev.midataGroupMappings.map((m, i) =>
        i === index ? { ...m, groupId: isNaN(groupId) ? 0 : groupId } : m
      ),
    }));
  };

  const handleAddRoleClass = (mappingIndex: number, roleClass: string) => {
    if (!roleClass.trim()) return;
    setRole((prev) => ({
      ...prev,
      midataGroupMappings: prev.midataGroupMappings.map((m, i) =>
        i === mappingIndex && !m.roleClasses.includes(roleClass.trim())
          ? { ...m, roleClasses: [...m.roleClasses, roleClass.trim()] }
          : m
      ),
    }));
  };

  const handleRemoveRoleClass = (mappingIndex: number, roleClass: string) => {
    setRole((prev) => ({
      ...prev,
      midataGroupMappings: prev.midataGroupMappings.map((m, i) =>
        i === mappingIndex
          ? { ...m, roleClasses: m.roleClasses.filter((r) => r !== roleClass) }
          : m
      ),
    }));
  };

  const handleSave = async () => {
    if (!role.name.trim()) {
      toast.error("Role name is required");
      return;
    }
    try {
      const config = await getSecurityConfig();
      const idx = config.roles.findIndex((r) => r.name === role.name);
      if (idx > -1) {
        // Preserve permissions and allowedClients from existing role
        config.roles[idx] = {
          ...config.roles[idx],
          name: role.name,
          description: role.description,
          midataGroupMappings: role.midataGroupMappings,
        };
      } else {
        config.roles.push(role);
      }
      await saveSecurityConfig(config);
      queryClient.invalidateQueries({ queryKey: ["securityConfig"] });
      setOpen(false);
      toast.success("Role saved successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save role");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add Role" : mode === "edit" ? "Edit Role" : "View Role"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Role Name
              </Label>
              <Input
                disabled={isReadOnly || mode === "edit"}
                value={role.name}
                onChange={(e) =>
                  setRole((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Admin"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Description
              </Label>
              <Input
                disabled={isReadOnly}
                value={role.description}
                onChange={(e) =>
                  setRole((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Description"
              />
            </div>
          </div>

          {/* MiData Group Mappings */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b pb-1">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                MiData Group Mappings
              </Label>
              {!isReadOnly && (
                <Button variant="secondary" size="sm" onClick={handleAddMapping}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Group
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              A user gets this role if they match any mapping: they must belong
              to the group AND hold one of the listed role classes. Empty role
              classes = any role in the group.
            </p>

            {role.midataGroupMappings.length === 0 && (
              <span className="text-xs text-muted-foreground italic">
                No group mappings — this role can only be assigned manually.
              </span>
            )}

            {role.midataGroupMappings.map((mapping, idx) => (
              <MappingCard
                key={idx}
                mapping={mapping}
                index={idx}
                isReadOnly={isReadOnly}
                onGroupIdChange={handleMappingGroupIdChange}
                onAddRoleClass={handleAddRoleClass}
                onRemoveRoleClass={handleRemoveRoleClass}
                onRemove={handleRemoveMapping}
              />
            ))}
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">
              {isReadOnly ? "Close" : "Cancel"}
            </Button>
          </DialogClose>
          {!isReadOnly && <Button onClick={handleSave}>Save</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MappingCard({
  mapping,
  index,
  isReadOnly,
  onGroupIdChange,
  onAddRoleClass,
  onRemoveRoleClass,
  onRemove,
}: {
  mapping: MidataGroupMapping;
  index: number;
  isReadOnly: boolean;
  onGroupIdChange: (index: number, value: string) => void;
  onAddRoleClass: (index: number, roleClass: string) => void;
  onRemoveRoleClass: (index: number, roleClass: string) => void;
  onRemove: (index: number) => void;
}) {
  const [roleClassInput, setRoleClassInput] = useState("");

  return (
    <div className="rounded-lg border bg-muted/30 p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 flex-1">
          <Label className="text-xs text-muted-foreground">Group ID</Label>
          <Input
            type="number"
            disabled={isReadOnly}
            value={mapping.groupId || ""}
            onChange={(e) => onGroupIdChange(index, e.target.value)}
            placeholder="e.g. 1172"
            className="max-w-[200px] font-mono"
          />
        </div>
        {!isReadOnly && (
          <Button
            variant="ghost"
            size="icon"
            className="mt-5 shrink-0"
            onClick={() => onRemove(index)}
          >
            <X className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">
          Role Classes{" "}
          <span className="text-muted-foreground/60">
            (empty = any role in group)
          </span>
        </Label>
        {!isReadOnly && (
          <div className="flex gap-2">
            <Input
              value={roleClassInput}
              onChange={(e) => setRoleClassInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddRoleClass(index, roleClassInput);
                  setRoleClassInput("");
                }
              }}
              placeholder="e.g. Group::Abteilung::Abteilungsleitung"
              className="text-sm font-mono"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onAddRoleClass(index, roleClassInput);
                setRoleClassInput("");
              }}
              disabled={!roleClassInput.trim()}
            >
              Add
            </Button>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {mapping.roleClasses.length === 0 && (
            <span className="text-xs text-muted-foreground italic">
              Any role in this group
            </span>
          )}
          {mapping.roleClasses.map((rc) => (
            <span
              key={rc}
              className="inline-flex items-center gap-1 rounded bg-background px-2 py-0.5 text-xs font-mono border"
            >
              {rc}
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => onRemoveRoleClass(index, rc)}
                  className="ml-0.5 hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

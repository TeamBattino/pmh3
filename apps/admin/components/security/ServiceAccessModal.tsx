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
import { toast } from "@/components/ui/Sonner";
import {
  getSecurityConfig,
  saveSecurityConfig,
  getAuthClientList,
} from "@/lib/db/db-actions";
import { queryClient } from "@/lib/query-client";
import type { Role } from "@/lib/security/security-config";
import { useState } from "react";

interface ServiceAccessModalProps {
  role: Role;
  canEdit: boolean;
  trigger: React.ReactNode;
}

export function ServiceAccessModal({
  role: initialRole,
  canEdit,
  trigger,
}: ServiceAccessModalProps) {
  const [open, setOpen] = useState(false);
  const [allowedClients, setAllowedClients] = useState<string[]>(
    initialRole.allowedClients ?? []
  );
  const [availableClients, setAvailableClients] = useState<
    { clientId: string; name: string }[]
  >([]);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setAllowedClients(initialRole.allowedClients ?? []);
      getAuthClientList()
        .then(setAvailableClients)
        .catch(() => setAvailableClients([]));
    }
  };

  const handleToggle = (clientId: string, checked: boolean) => {
    setAllowedClients((prev) =>
      checked ? [...prev, clientId] : prev.filter((c) => c !== clientId)
    );
  };

  const handleSave = async () => {
    try {
      const config = await getSecurityConfig();
      const idx = config.roles.findIndex((r) => r.name === initialRole.name);
      if (idx === -1) {
        toast.error("Role not found");
        return;
      }
      config.roles[idx] = { ...config.roles[idx], allowedClients };
      await saveSecurityConfig(config);
      queryClient.invalidateQueries({ queryKey: ["securityConfig"] });
      setOpen(false);
      toast.success("Service access updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save service access");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {canEdit ? "Edit" : "View"} Service Access — {initialRole.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {availableClients.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4 text-center">
              No services registered. Add services in the Services tab first.
            </p>
          ) : (
            availableClients.map((client) => (
              <label
                key={client.clientId}
                className="flex items-center gap-2.5 rounded-md bg-muted/50 p-3 px-4 border hover:bg-accent transition-colors cursor-pointer data-[disabled=true]:cursor-default data-[disabled=true]:opacity-70"
                data-disabled={!canEdit}
              >
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={allowedClients.includes(client.clientId)}
                  onChange={(e) =>
                    handleToggle(client.clientId, e.target.checked)
                  }
                  className="h-3.5 w-3.5 rounded border-input disabled:cursor-not-allowed"
                />
                <div>
                  <span className="text-sm font-medium">{client.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({client.clientId})
                  </span>
                </div>
              </label>
            ))
          )}
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

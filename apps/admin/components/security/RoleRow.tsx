import { Button } from "@/components/ui/Button";
import { Dialog, DialogTrigger } from "@/components/ui/Dialog";
import { TableCell, TableRow } from "@/components/ui/Table";
import { getSecurityConfig, saveSecurityConfig } from "@/lib/db/db-actions";
import { queryClient } from "@/lib/query-client";
import { useHasPermission } from "@/lib/security/hooks/has-permission";
import { Role } from "@/lib/security/security-config";
import ConfirmModal from "@/components/admin/ConfirmModal";
import { RoleMappingModal } from "./RoleMappingModal";

type RoleRowProps = {
  role: Role;
  variant?: "table" | "card";
};

function RoleRow({ role, variant = "table" }: RoleRowProps) {
  const handleDelete = async () => {
    const securityConfig = await getSecurityConfig();
    securityConfig.roles = securityConfig.roles.filter(
      (r) => r.name !== role.name
    );
    await saveSecurityConfig(securityConfig);
    queryClient.invalidateQueries({ queryKey: ["securityConfig"] });
  };

  const canEdit = useHasPermission({ any: ["role-permissions:update"] });

  if (variant === "table") {
    return (
      <TableRow key={role.name}>
        <TableCell className="font-semibold">
          {role.name}
        </TableCell>
        <TableCell className="max-w-md truncate text-muted-foreground text-sm">
          {role.description}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-2">
            <RoleMappingModal
              mode={canEdit ? "edit" : "view"}
              role={role}
              trigger={
                <Button variant={canEdit ? "default" : "secondary"} size="sm">
                  {canEdit ? "Edit" : "View permissions"}
                </Button>
              }
            />

            {canEdit && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    Delete
                  </Button>
                </DialogTrigger>
                <ConfirmModal
                  title="Delete Role"
                  message={`Are you sure you want to delete the role "${role.name}"? This action cannot be undone.`}
                  onConfirm={handleDelete}
                />
              </Dialog>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4 border-b last:border-0 hover:bg-muted/50 transition-colors">
      <div className="flex justify-between items-start gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">
            {role.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{role.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <RoleMappingModal
          mode={canEdit ? "edit" : "view"}
          role={role}
          trigger={
            <Button
              variant={canEdit ? "default" : "secondary"}
              size="sm"
              className="flex-1"
            >
              {canEdit ? "Edit" : "View"}
            </Button>
          }
        />

        {canEdit && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
                Delete
              </Button>
            </DialogTrigger>
            <ConfirmModal
              title="Delete Role"
              message={`Are you sure you want to delete the role "${role.name}"? This action cannot be undone.`}
              onConfirm={handleDelete}
            />
          </Dialog>
        )}
      </div>
    </div>
  );
}

export default RoleRow;

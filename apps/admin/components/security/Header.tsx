"use client";

import { PermissionGuard } from "@/components/security/PermissionGuard";
import { Button } from "@/components/ui/Button";
import { PageHeading } from "@/components/ui/Heading";
import { RoleModal } from "./RoleModal";

function Header() {
  return (
    <div className="flex flex-wrap gap-2 justify-between items-center">
      <PageHeading>Roles</PageHeading>
      <div className="flex flex-wrap gap-2">
        <PermissionGuard policy={{ all: ["role-permissions:update"] }}>
          <RoleModal
            mode="add"
            trigger={<Button>Add Role</Button>}
          />
        </PermissionGuard>
      </div>
    </div>
  );
}

export default Header;

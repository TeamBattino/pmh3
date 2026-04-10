"use client";

import { PermissionGuard } from "@/components/security/PermissionGuard";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { RoleModal } from "./RoleModal";

function Header() {
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-2 justify-between items-center">
      <h1 className="text-2xl font-semibold tracking-tight">Security Manager</h1>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => router.push("/")}>
          Back to Admin
        </Button>

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

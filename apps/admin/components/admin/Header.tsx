"use client";

import { PermissionGuard } from "@/components/security/PermissionGuard";
import { Button } from "@/components/ui/Button";
import { PageHeading } from "@/components/ui/Heading";

type HeaderProps = {
  onAddPage: () => void;
};

function Header({ onAddPage }: HeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <PageHeading>Pages</PageHeading>
      <PermissionGuard policy={{ all: ["page:create"] }}>
        <Button onClick={onAddPage}>Add Page</Button>
      </PermissionGuard>
    </div>
  );
}

export default Header;

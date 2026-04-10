"use client";

import { PermissionGuard } from "@/components/security/PermissionGuard";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogTrigger } from "@/components/ui/Dialog";
import { PageHeading } from "@/components/ui/Heading";
import AddPageModal from "./AddPageModal";

function Header() {
  return (
    <div className="flex flex-wrap gap-2 justify-between items-center">
      <PageHeading>Pages</PageHeading>
      <div className="flex flex-wrap gap-2">
        <PermissionGuard policy={{ all: ["page:create"] }}>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Add Page</Button>
            </DialogTrigger>
            <AddPageModal />
          </Dialog>
        </PermissionGuard>
      </div>
    </div>
  );
}

export default Header;

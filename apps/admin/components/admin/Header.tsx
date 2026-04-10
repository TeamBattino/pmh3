import { PermissionGuard } from "@/components/security/PermissionGuard";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogTrigger } from "@/components/ui/Dialog";
import { useRouter } from "next/navigation";
import AddPageModal from "./AddPageModal";

function Header() {
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-2 justify-between items-center">
      <h1 className="text-2xl font-semibold tracking-tight">Leitereberiich</h1>
      <div className="flex flex-wrap gap-2">
        <PermissionGuard policy={{ all: ["role-permissions:read"] }}>
          <Button variant="outline" onClick={() => router.push("/security")}>
            Security Manager
          </Button>
        </PermissionGuard>
        <PermissionGuard policy={{ all: ["navbar:update"] }}>
          <Button variant="outline" size="sm" onClick={() => router.push("/navbar")}>
            Navbar
          </Button>
        </PermissionGuard>
        <PermissionGuard policy={{ all: ["footer:update"] }}>
          <Button variant="outline" size="sm" onClick={() => router.push("/footer")}>
            Footer
          </Button>
        </PermissionGuard>
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

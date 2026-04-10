import { PermissionGuard } from "@/components/security/PermissionGuard";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogTrigger } from "@/components/ui/Dialog";
import { TableCell, TableRow } from "@/components/ui/Table";
import { deletePage } from "@/lib/db/db-actions";
import { queryClient } from "@/lib/query-client";
import { useRouter } from "next/navigation";
import ConfirmModal from "./ConfirmModal";

type PageRowProps = {
  page: string;
};

function PageRow({ page }: PageRowProps) {
  const router = useRouter();

  const handleEdit = () => {
    router.push(`/editor${page}`);
  };

  const handleView = () => {
    router.push(page);
  };

  const handleDelete = async () => {
    await deletePage(page);
    queryClient.invalidateQueries({ queryKey: ["pages"] });
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{page}</TableCell>
      <TableCell className="text-right">
        <div className="flex flex-wrap gap-2 justify-end">
          <PermissionGuard policy={{ all: ["page:delete"] }}>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">Delete</Button>
              </DialogTrigger>
              <ConfirmModal
                title="Delete Page"
                message="Are you sure you want to delete this page?"
                onConfirm={handleDelete}
              />
            </Dialog>
          </PermissionGuard>
          <PermissionGuard policy={{ all: ["page:update"] }}>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              Edit
            </Button>
          </PermissionGuard>
          <Button size="sm" onClick={handleView}>
            View
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default PageRow;

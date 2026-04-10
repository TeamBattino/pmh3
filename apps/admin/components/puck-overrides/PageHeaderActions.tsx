"use client";
import SpinnerSvg from "@pfadipuck/graphics/SpinnerSvg";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogTrigger } from "@/components/ui/Dialog";
import { toast } from "@/components/ui/Sonner";
import { PageConfig } from "@pfadipuck/puck-web/config/page.config";
import { deletePage, savePage } from "@/lib/db/db-actions";
import { queryClient } from "@/lib/query-client";
import { usePuck } from "@measured/puck";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/admin/ConfirmModal";
import UndoRedoButtons from "./UndoRedoButtons";

type PageHeaderActionsProps = {
  path: string;
};

function PageHeaderActions({ path }: PageHeaderActionsProps) {
  const router = useRouter();
  const {
    appState: { data },
  } = usePuck<PageConfig>();

  const handleDelete = async () => {
    await deletePage(path);
    queryClient.invalidateQueries({ queryKey: ["pages"] });
  };

  const { mutate: savePageMutation, isPending } = useMutation({
    mutationFn: async () => {
      await savePage(path, data);
      queryClient.invalidateQueries({ queryKey: ["pages"] });
    },
    onSuccess: () => toast("Page saved successfully"),
  });

  return (
    <div className="flex gap-4 items-center justify-between">
      <UndoRedoButtons />

      <div className="flex flex-wrap gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">
              Delete
            </Button>
          </DialogTrigger>

          <ConfirmModal
            title="Delete Page"
            message="Are you sure you want to delete this page?"
            onConfirm={handleDelete}
          />
        </Dialog>

        <Button
          onClick={() => router.push("/")}
          variant="outline"
          size="sm"
        >
          To Admin
        </Button>

        <Button
          onClick={() => router.push(path)}
          variant="outline"
          size="sm"
        >
          View Page
        </Button>
      </div>
      <Button
        onClick={() => savePageMutation()}
        variant="default"
        className="flex gap-2 items-center"
        disabled={isPending}
      >
        Save Changes
        {isPending && <SpinnerSvg className="w-4 h-4" />}
      </Button>
    </div>
  );
}

export default PageHeaderActions;

"use client";
import SpinnerSvg from "@pfadipuck/graphics/SpinnerSvg";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Sonner";
import { PageConfig } from "@pfadipuck/puck-web/config/page.config";
import { savePage } from "@/lib/db/db-actions";
import { queryClient } from "@/lib/query-client";
import { usePuck } from "@puckeditor/core";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import UndoRedoButtons from "./UndoRedoButtons";

type PageHeaderActionsProps = {
  path: string;
};

function PageHeaderActions({ path }: PageHeaderActionsProps) {
  const router = useRouter();
  const {
    appState: { data },
  } = usePuck<PageConfig>();

  const { mutate: savePageMutation, isPending } = useMutation({
    mutationFn: async () => {
      await savePage(path, data);
      queryClient.invalidateQueries({ queryKey: ["pages"] });
    },
    onSuccess: () => toast("Page saved successfully"),
  });

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 sm:items-center sm:justify-between">
      <div className="hidden sm:block">
        <UndoRedoButtons />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => router.push("/web")}
          variant="outline"
          size="sm"
          className="flex-1 sm:flex-none"
        >
          To Admin
        </Button>

        <Button
          onClick={() => router.push(path)}
          variant="outline"
          size="sm"
          className="flex-1 sm:flex-none"
        >
          View Page
        </Button>
      </div>
      <Button
        onClick={() => savePageMutation()}
        variant="default"
        className="flex gap-2 items-center w-full sm:w-auto"
        disabled={isPending}
      >
        Save Changes
        {isPending && <SpinnerSvg className="w-4 h-4" />}
      </Button>
    </div>
  );
}

export default PageHeaderActions;

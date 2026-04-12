"use client";
import SpinnerSvg from "@pfadipuck/graphics/SpinnerSvg";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Sonner";
import { Config, usePuck, UserGenerics } from "@puckeditor/core";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import UndoRedoButtons from "./UndoRedoButtons";

type OtherHeaderActionsProps<UserConfig extends Config> = {
  saveData: (data: UserGenerics<UserConfig>["UserData"]) => Promise<void>;
};

function OtherHeaderActions<UserConfig extends Config>({
  saveData,
}: OtherHeaderActionsProps<UserConfig>) {
  const router = useRouter();
  const {
    appState: { data },
  } = usePuck<UserConfig>();

  const { mutate: saveMutation, isPending } = useMutation({
    mutationFn: saveData,
    onSuccess: () => toast("Saved successfully"),
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
      </div>

      <Button
        onClick={() => saveMutation(data)}
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

export default OtherHeaderActions;

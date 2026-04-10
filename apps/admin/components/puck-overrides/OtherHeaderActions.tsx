"use client";
import SpinnerSvg from "@pfadipuck/graphics/SpinnerSvg";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Sonner";
import { Config, usePuck, UserGenerics } from "@measured/puck";
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
    <div className="flex gap-4 items-center justify-between">
      <UndoRedoButtons />

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => router.push("/")}
          variant="outline"
          size="sm"
        >
          To Admin
        </Button>
      </div>

      <Button
        onClick={() => saveMutation(data)}
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

export default OtherHeaderActions;

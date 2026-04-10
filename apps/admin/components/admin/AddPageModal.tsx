"use client";
import { Button } from "@/components/ui/Button";
import {
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/Dialog";
import { ErrorLabel } from "@/components/ui/ErrorLabel";
import { Input } from "@/components/ui/Input";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

function AddPageModal() {
  const router = useRouter();
  const [newPagePath, setNewPagePath] = useState("");

  const handleCreate = async (path: string) => {
    if (path.trim() === "") throw new Error("Page path cannot be empty");

    router.push(`/web/editor/${path.trim()}`);
  };

  const { mutate: createPage, error } = useMutation({
    mutationFn: handleCreate,
  });

  return (
    <DialogContent>
      <DialogTitle>Add New Page</DialogTitle>
      <Input
        type="text"
        placeholder="Enter new page path"
        className="w-full mb-2"
        value={newPagePath}
        onChange={(e) => setNewPagePath(e.target.value)}
      />
      {error && <ErrorLabel message={error.message} />}
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary" size="sm">Cancel</Button>
        </DialogClose>
        <Button
          size="sm"
          onClick={() => createPage(newPagePath)}
        >
          Create Page
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default AddPageModal;

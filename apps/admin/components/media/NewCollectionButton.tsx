"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { useCreateCollection } from "@/lib/files/file-system-hooks";
import type { CollectionType } from "@/lib/db/file-system-types";

export function NewCollectionButton({
  type,
  parentId,
  label,
}: {
  type: CollectionType;
  parentId: string | null;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const create = useCreateCollection();

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    await create.mutateAsync({ type, title: trimmed, parentId });
    setTitle("");
    setOpen(false);
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1 size-4" aria-hidden />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={!title.trim() || create.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

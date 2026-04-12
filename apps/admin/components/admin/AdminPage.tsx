"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { deletePage, getAllPages } from "@/lib/db/db-actions";
import type { PageListItem } from "@/lib/db/db";
import { queryClient } from "@/lib/query-client";
import Header from "./Header";
import { PageList } from "./PageList";
import { CreatePageModal } from "./CreatePageModal";
import ConfirmModal from "./ConfirmModal";

function AdminPage() {
  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["pages"],
    queryFn: getAllPages,
  });

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState<PageListItem | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<PageListItem | null>(null);

  const filtered = useMemo(() => {
    if (!search) return pages;
    const q = search.toLowerCase();
    return pages.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.path.toLowerCase().includes(q)
    );
  }, [pages, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePage(deleteTarget.path);
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      toast.success("Page deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
    setDeleteTarget(null);
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <Header onAddPage={() => setCreateOpen(true)} />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search pages…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <PageList
        pages={filtered}
        isLoading={isLoading}
        onDuplicate={(page) => setDuplicateSource(page)}
        onDelete={(page) => setDeleteTarget(page)}
      />

      {/* Create modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        {createOpen && (
          <CreatePageModal
            pages={pages}
            onCreated={() => setCreateOpen(false)}
          />
        )}
      </Dialog>

      {/* Duplicate modal */}
      <Dialog
        open={!!duplicateSource}
        onOpenChange={(open) => {
          if (!open) setDuplicateSource(null);
        }}
      >
        {duplicateSource && (
          <CreatePageModal
            pages={pages}
            sourcePath={duplicateSource.path}
            sourceTitle={duplicateSource.title}
            onCreated={() => setDuplicateSource(null)}
          />
        )}
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        {deleteTarget && (
          <ConfirmModal
            title="Delete Page"
            message={`Are you sure you want to delete "${deleteTarget.title}" (${deleteTarget.path})?`}
            onConfirm={handleDelete}
          />
        )}
      </Dialog>
    </div>
  );
}

export default AdminPage;

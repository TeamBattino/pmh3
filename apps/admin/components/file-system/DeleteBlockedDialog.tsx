"use client";

import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import type { Reference } from "@/lib/db/file-system-types";

/**
 * Shown when a delete or bulk-delete is blocked by Puck references.
 * Renders a flat list of blockers for single-file deletes, or a grouped
 * list for bulk deletes.
 */
export type DeleteBlockedDialogProps = {
  open: boolean;
  onClose: () => void;
  blockers: Array<{
    label: string;
    references: Reference[];
  }>;
};

export function DeleteBlockedDialog({
  open,
  onClose,
  blockers,
}: DeleteBlockedDialogProps) {
  const total = blockers.reduce((acc, b) => acc + b.references.length, 0);
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cannot delete</DialogTitle>
          <DialogDescription>
            {total === 1
              ? "This file is used on 1 page."
              : `These files are used on ${total} pages.`}{" "}
            Remove them from those components first.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-96 space-y-4 overflow-y-auto">
          {blockers.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="text-sm font-medium">{group.label}</div>
              <ul className="space-y-1">
                {group.references.map((ref, i) => (
                  <li
                    key={`${ref.pageId}-${ref.componentId}-${ref.propPath}-${i}`}
                    className="flex items-center justify-between rounded border border-border bg-muted px-2 py-1 text-xs"
                  >
                    <span className="truncate">
                      <strong>{ref.componentId}</strong> on{" "}
                      <span className="font-mono">{ref.pageId}</span>
                      <span className="ml-1 text-muted-foreground">
                        ({ref.propPath})
                      </span>
                    </span>
                    <div className="flex items-center gap-1">
                      {ref.pageId.startsWith("/") && (
                        <>
                          <a
                            href={ref.pageId}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <ExternalLink className="size-3" aria-hidden />
                            Page
                          </a>
                          <a
                            href={`/web/editor${ref.pageId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <ExternalLink className="size-3" aria-hidden />
                            Editor
                          </a>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

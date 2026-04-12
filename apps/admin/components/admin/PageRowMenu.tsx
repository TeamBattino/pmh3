"use client";

import {
  Copy,
  ExternalLink,
  MoreVertical,
  PencilLine,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { PermissionGuard } from "@/components/security/PermissionGuard";
import { cn } from "@/lib/cn";

export type PageRowMenuProps = {
  path: string;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export function PageRowMenu({
  path,
  onEdit,
  onDuplicate,
  onDelete,
}: PageRowMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Page actions"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none",
          "md:opacity-0 md:group-hover:opacity-100 md:data-[state=open]:opacity-100"
        )}
      >
        <MoreVertical className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <PermissionGuard policy={{ any: ["page:create", "page:update"] }}>
          <DropdownMenuItem onSelect={onEdit}>
            <PencilLine aria-hidden />
            Edit
          </DropdownMenuItem>
        </PermissionGuard>
        <DropdownMenuItem
          onSelect={() => window.open(path, "_blank")}
        >
          <ExternalLink aria-hidden />
          View on site
        </DropdownMenuItem>
        <PermissionGuard policy={{ all: ["page:create"] }}>
          <DropdownMenuItem onSelect={onDuplicate}>
            <Copy aria-hidden />
            Duplicate
          </DropdownMenuItem>
        </PermissionGuard>
        <DropdownMenuSeparator />
        <PermissionGuard policy={{ all: ["page:delete"] }}>
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 aria-hidden />
            Delete
          </DropdownMenuItem>
        </PermissionGuard>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

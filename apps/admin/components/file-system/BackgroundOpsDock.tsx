"use client";

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  useBackgroundOps,
  useOperations,
  type Operation,
} from "./BackgroundOpsProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

/**
 * Persistent background-ops dock. Sits fixed bottom-right, expanded by
 * default (hidden when the queue is empty, collapsible via the header).
 */
export function BackgroundOpsDock() {
  const ops = useOperations();
  const { clearCompleted, removeOperation } = useBackgroundOps();
  const [expanded, setExpanded] = useState(true);

  // Fade out completed ops after 3 seconds (errors stay pinned).
  useEffect(() => {
    const timers = ops
      .filter((o) => o.status === "success")
      .map((o) =>
        setTimeout(() => removeOperation(o.id), 3000)
      );
    return () => timers.forEach(clearTimeout);
  }, [ops, removeOperation]);

  if (ops.length === 0) return null;

  const active = ops.filter(
    (o) => o.status === "running" || o.status === "queued"
  );
  const completed = ops.filter((o) => o.status === "success").length;
  const errored = ops.filter((o) => o.status === "error").length;

  const summary =
    active.length > 0
      ? `${active.length} in progress`
      : errored > 0
        ? `${errored} failed`
        : `${completed} complete`;

  return (
    <div
      role="region"
      aria-label="Background tasks"
      className={cn(
        "fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)]",
        "rounded-lg border border-border bg-background shadow-lg",
        "sm:bottom-4 sm:right-4"
      )}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm font-medium"
        onClick={() => setExpanded((e) => !e)}
      >
        <span className="flex items-center gap-2">
          {active.length > 0 ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : errored > 0 ? (
            <AlertCircle className="size-4 text-destructive" aria-hidden />
          ) : (
            <CheckCircle2 className="size-4 text-green-600" aria-hidden />
          )}
          <span>{summary}</span>
        </span>
        {expanded ? (
          <ChevronDown className="size-4" aria-hidden />
        ) : (
          <ChevronUp className="size-4" aria-hidden />
        )}
      </button>

      {expanded && (
        <>
          <div className="max-h-72 overflow-y-auto border-t border-border">
            {ops.map((op) => (
              <OperationRow
                key={op.id}
                op={op}
                onDismiss={() => removeOperation(op.id)}
              />
            ))}
          </div>
          {completed >= 2 && (
            <div className="flex justify-end border-t border-border p-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={clearCompleted}
              >
                Clear completed
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OperationRow({
  op,
  onDismiss,
}: {
  op: Operation;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col gap-1 border-b border-border px-3 py-2 last:border-b-0"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{op.title}</div>
          {op.subtitle && (
            <div className="truncate text-xs text-muted-foreground">
              {op.subtitle}
            </div>
          )}
        </div>
        <StatusIcon op={op} />
        {op.status !== "running" && op.status !== "queued" && (
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onDismiss}
            className="rounded p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="size-3" aria-hidden />
          </button>
        )}
        {op.status === "running" && op.cancel && (
          <button
            type="button"
            aria-label="Cancel"
            onClick={op.cancel}
            className="rounded p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="size-3" aria-hidden />
          </button>
        )}
      </div>
      {(op.status === "running" || op.status === "queued") &&
        typeof op.progress === "number" && (
          <div className="h-1 overflow-hidden rounded bg-muted">
            <div
              className="h-full bg-admin-primary transition-all"
              style={{ width: `${op.progress}%` }}
            />
          </div>
        )}
      {op.status === "error" && op.error && (
        <div className="text-xs text-destructive">{op.error}</div>
      )}
      {op.status === "error" && op.retry && (
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          onClick={() => op.retry?.()}
        >
          Retry
        </Button>
      )}
    </div>
  );
}

function StatusIcon({ op }: { op: Operation }) {
  if (op.status === "running")
    return <Loader2 className="size-4 animate-spin" aria-hidden />;
  if (op.status === "queued")
    return <Loader2 className="size-4 opacity-50" aria-hidden />;
  if (op.status === "success")
    return <CheckCircle2 className="size-4 text-green-600" aria-hidden />;
  if (op.status === "error")
    return <AlertCircle className="size-4 text-destructive" aria-hidden />;
  return null;
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";

/**
 * Global provider for long-running file operations (uploads, bulk deletes).
 *
 * Placed above every route group in `app/layout.tsx` so ops survive route
 * changes. State lives in a ref with manual subscribers so progress updates
 * do not trigger a full React tree rerender — only the dock's subscribed
 * components update.
 *
 * Inspired by Google Drive's persistent upload tray.
 */

export type OperationKind = "upload" | "bulk-delete" | "gc";
export type OperationStatus =
  | "queued"
  | "running"
  | "success"
  | "error"
  | "cancelled";

export type Operation = {
  id: string;
  kind: OperationKind;
  title: string;
  subtitle?: string;
  status: OperationStatus;
  /** 0-100. Undefined = indeterminate. */
  progress?: number;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  cancel?: () => void;
  retry?: () => Promise<void>;
  invalidateKeys?: QueryKey[];
  result?: unknown;
};

export type CreateOperationInput = Omit<
  Operation,
  "id" | "startedAt" | "status"
> & {
  status?: OperationStatus;
};

type OpsStore = {
  getSnapshot: () => Operation[];
  subscribe: (cb: () => void) => () => void;
  add: (op: CreateOperationInput) => string;
  update: (id: string, patch: Partial<Operation>) => void;
  remove: (id: string) => void;
  clear: (status?: OperationStatus) => void;
};

function createOpsStore(): OpsStore {
  let ops: Operation[] = [];
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  let counter = 0;
  const nextId = () => `op-${Date.now()}-${++counter}`;

  return {
    getSnapshot: () => ops,
    subscribe: (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    add: (input) => {
      const id = nextId();
      const op: Operation = {
        ...input,
        id,
        startedAt: new Date(),
        status: input.status ?? "running",
      };
      ops = [...ops, op];
      notify();
      return id;
    },
    update: (id, patch) => {
      let changed = false;
      ops = ops.map((op) => {
        if (op.id !== id) return op;
        changed = true;
        return { ...op, ...patch };
      });
      if (changed) notify();
    },
    remove: (id) => {
      const before = ops.length;
      ops = ops.filter((op) => op.id !== id);
      if (ops.length !== before) notify();
    },
    clear: (status) => {
      if (status) ops = ops.filter((op) => op.status !== status);
      else ops = [];
      notify();
    },
  };
}

type BackgroundOpsContextValue = {
  store: OpsStore;
  addOperation: (input: CreateOperationInput) => string;
  updateOperation: (id: string, patch: Partial<Operation>) => void;
  removeOperation: (id: string) => void;
  clearCompleted: () => void;
  runOperation: <T>(
    meta: Omit<CreateOperationInput, "status">,
    runner: (handle: {
      update: (patch: Partial<Operation>) => void;
      setProgress: (p: number) => void;
    }) => Promise<T>
  ) => Promise<T>;
};

const BackgroundOpsContext = createContext<BackgroundOpsContextValue | null>(
  null
);

export function BackgroundOpsProvider({ children }: { children: ReactNode }) {
  // Lazy-init the store via `useState` so we create it exactly once per
  // provider instance and without touching a ref during render (React 19
  // strict mode flags that pattern).
  const [store] = useState<OpsStore>(() => createOpsStore());
  const qc = useQueryClient();

  const addOperation = useCallback(
    (input: CreateOperationInput) => store.add(input),
    [store]
  );
  const updateOperation = useCallback(
    (id: string, patch: Partial<Operation>) => store.update(id, patch),
    [store]
  );
  const removeOperation = useCallback(
    (id: string) => store.remove(id),
    [store]
  );
  const clearCompleted = useCallback(() => store.clear("success"), [store]);

  const runOperation = useCallback(
    async function runOp<T>(
      meta: Omit<CreateOperationInput, "status">,
      runner: (handle: {
        update: (patch: Partial<Operation>) => void;
        setProgress: (p: number) => void;
      }) => Promise<T>
    ): Promise<T> {
      const id = store.add({ ...meta, status: "running" });
      const handle = {
        update: (patch: Partial<Operation>) => store.update(id, patch),
        setProgress: (p: number) => store.update(id, { progress: p }),
      };
      try {
        const result = await runner(handle);
        store.update(id, {
          status: "success",
          progress: 100,
          completedAt: new Date(),
          result,
        });
        // Invalidate query keys declared at op-creation time.
        const op = store
          .getSnapshot()
          .find((o) => o.id === id);
        for (const key of op?.invalidateKeys ?? []) {
          qc.invalidateQueries({ queryKey: key });
        }
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        store.update(id, {
          status: "error",
          error: message,
          completedAt: new Date(),
        });
        throw err;
      }
    },
    [store, qc]
  );

  // beforeunload guard while anything is in-flight.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const ops = store.getSnapshot();
      const active = ops.some(
        (o) => o.status === "running" || o.status === "queued"
      );
      if (active) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [store]);

  const value = useMemo<BackgroundOpsContextValue>(
    () => ({
      store,
      addOperation,
      updateOperation,
      removeOperation,
      clearCompleted,
      runOperation,
    }),
    [
      store,
      addOperation,
      updateOperation,
      removeOperation,
      clearCompleted,
      runOperation,
    ]
  );

  return (
    <BackgroundOpsContext.Provider value={value}>
      {children}
    </BackgroundOpsContext.Provider>
  );
}

export function useBackgroundOps(): BackgroundOpsContextValue {
  const ctx = useContext(BackgroundOpsContext);
  if (!ctx) {
    throw new Error(
      "useBackgroundOps must be used within a BackgroundOpsProvider"
    );
  }
  return ctx;
}

/**
 * Subscribe to the operations list via `useSyncExternalStore`. Only this
 * hook re-renders on op changes — the provider itself doesn't.
 */
export function useOperations(): Operation[] {
  const ctx = useContext(BackgroundOpsContext);
  if (!ctx) {
    throw new Error(
      "useOperations must be used within a BackgroundOpsProvider"
    );
  }
  return useSyncExternalStore(
    ctx.store.subscribe,
    ctx.store.getSnapshot,
    ctx.store.getSnapshot
  );
}

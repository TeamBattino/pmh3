"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type AutosaveState = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 800;
const RETRY_DELAYS_MS = [2_000, 5_000, 15_000];

/**
 * Debounced autosave with last-write-wins guard and exponential retry.
 *
 * - Fires `save(value)` after DEBOUNCE_MS of no changes.
 * - If a newer value arrives mid-flight, we discard the stale result
 *   (compared via `requestId`) and save again.
 * - On failure, retries with 2s / 5s / 15s backoff until a new edit or
 *   success resets the schedule.
 * - `flush()` forces any pending debounced save to run immediately and
 *   resolves when it settles.
 * - `isDirty` is true whenever the committed baseline doesn't match the
 *   current value — use it for `beforeunload` guards.
 */
export function useAutosave<T>({
  value,
  initial,
  save,
  equals = defaultEquals,
  enabled = true,
}: {
  value: T;
  initial: T;
  save: (value: T) => Promise<void>;
  equals?: (a: T, b: T) => boolean;
  enabled?: boolean;
}): {
  state: AutosaveState;
  isDirty: boolean;
  flush: () => Promise<void>;
} {
  const [state, setState] = useState<AutosaveState>("idle");
  const baselineRef = useRef<T>(initial);
  const latestValueRef = useRef<T>(value);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttempt = useRef(0);
  const requestId = useRef(0);
  const inFlightRef = useRef<Promise<void> | null>(null);

  // Keep latest value reference fresh for flush/retry.
  latestValueRef.current = value;

  const clearTimers = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (retryTimer.current) clearTimeout(retryTimer.current);
    debounceTimer.current = null;
    retryTimer.current = null;
  };

  const runSave = useCallback(async () => {
    const myId = ++requestId.current;
    const snapshot = latestValueRef.current;
    setState("saving");
    const p = (async () => {
      try {
        await save(snapshot);
        if (myId !== requestId.current) return; // superseded
        baselineRef.current = snapshot;
        retryAttempt.current = 0;
        setState("saved");
      } catch (e) {
        console.error("autosave failed", e);
        if (myId !== requestId.current) return;
        setState("error");
        const delay =
          RETRY_DELAYS_MS[
            Math.min(retryAttempt.current, RETRY_DELAYS_MS.length - 1)
          ];
        retryAttempt.current += 1;
        retryTimer.current = setTimeout(() => {
          runSave();
        }, delay);
      }
    })();
    inFlightRef.current = p;
    return p;
  }, [save]);

  // Schedule debounced save when value diverges from baseline.
  useEffect(() => {
    if (!enabled) return;
    if (equals(value, baselineRef.current)) {
      // Back to clean — clear any pending work and stop indicator noise.
      clearTimers();
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
      retryAttempt.current = 0;
    }
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      runSave();
    }, DEBOUNCE_MS);
    return () => {
      // Don't clear here on every value change — the next effect run already
      // resets the timer. Cleanup only on unmount.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, enabled]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => clearTimers();
  }, []);

  const flush = useCallback(async () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
      await runSave();
      return;
    }
    if (inFlightRef.current) {
      await inFlightRef.current;
    }
  }, [runSave]);

  const isDirty = !equals(value, baselineRef.current);

  return { state, isDirty, flush };
}

function defaultEquals<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Join the worst of multiple autosave states into a single banner state. */
export function combineStates(states: AutosaveState[]): AutosaveState {
  if (states.includes("error")) return "error";
  if (states.includes("saving")) return "saving";
  if (states.includes("saved")) return "saved";
  return "idle";
}

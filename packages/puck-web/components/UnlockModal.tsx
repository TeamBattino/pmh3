"use client";

import { useEffect, useRef, useState } from "react";

export type UnlockModalProps = {
  open: boolean;
  onClose: () => void;
  onUnlocked: () => void | Promise<void>;
};

export function UnlockModal({ open, onClose, onUnlocked }: UnlockModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setPassword("");
      setError(null);
      // Focus after the modal mounts.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/media/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          reason?: string;
        };
        if (data.reason === "not-configured") {
          setError("This site is not accepting unlock attempts yet.");
        } else {
          setError("Wrong password.");
        }
        return;
      }
      await onUnlocked();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl bg-white p-6 text-black shadow-2xl"
      >
        <h2 className="text-lg font-semibold">Password required</h2>
        <p className="mt-1 text-sm text-black/60">
          This content is password protected. Enter the password to view it.
        </p>
        <input
          ref={inputRef}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mt-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          autoComplete="off"
        />
        {error && (
          <div className="mt-2 text-xs text-red-600" role="alert">
            {error}
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending || !password}
            className="rounded-md bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {pending ? "Unlocking…" : "Unlock"}
          </button>
        </div>
      </form>
    </div>
  );
}

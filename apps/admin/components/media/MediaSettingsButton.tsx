"use client";

import { Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  useMediaSettings,
  useSetMediaPassword,
} from "@/lib/files/file-system-hooks";

/**
 * Opens a dialog to view + change the global media password used to unlock
 * password-protected files and albums on the public site. Plain text by
 * design — see CLAUDE.md / project memory.
 */
export function MediaSettingsButton() {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { data } = useMediaSettings();
  const setPassword = useSetMediaPassword();
  const [value, setValue] = useState("");

  const current = data?.mediaPassword ?? "";
  const changed = value !== current;

  useEffect(() => {
    if (open) {
      setValue(current);
      setConfirming(false);
    }
  }, [open, current]);

  const onSave = () => {
    if (!changed) {
      setOpen(false);
      return;
    }
    setConfirming(true);
  };

  const commit = async () => {
    try {
      await setPassword.mutateAsync(value);
      toast.success(
        value ? "Media password saved" : "Media password cleared"
      );
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Lock className="mr-1 size-4" aria-hidden />
        Settings
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Media settings</DialogTitle>
          </DialogHeader>
          {confirming ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-md border border-border bg-muted p-3 text-sm">
                {value === "" ? (
                  <>
                    Clearing the password disables the unlock flow entirely.
                    Protected media becomes inaccessible to visitors until you
                    set a new password.
                  </>
                ) : current === "" ? (
                  <>
                    Set the media password to{" "}
                    <code className="font-mono">{value}</code>?
                  </>
                ) : (
                  <>
                    Change the media password from{" "}
                    <code className="font-mono">{current}</code> to{" "}
                    <code className="font-mono">{value}</code>? Visitors who
                    already unlocked with the old password stay unlocked until
                    their cookie expires.
                  </>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setConfirming(false)}
                  disabled={setPassword.isPending}
                >
                  Back
                </Button>
                <Button onClick={commit} disabled={setPassword.isPending}>
                  {setPassword.isPending ? "Saving…" : "Confirm"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="media-password">
                  Password for protected media
                </Label>
                <Input
                  id="media-password"
                  autoFocus
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Leave blank to disable"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSave();
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Visitors enter this password once to unlock all protected
                  images, videos and albums.
                </p>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={onSave} disabled={!changed}>
                  Save
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

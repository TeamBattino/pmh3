"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { previewOrphanGc, runOrphanGc } from "@/lib/db/file-system-actions";

/**
 * Manual orphan GC card — v1 version of section 13 in the plan. A single
 * button that previews, confirms, and runs the sweep. Lives on `/media`
 * behind an `asset:delete` gate (the parent page enforces it).
 */
export function OrphanGcCard() {
  const [running, setRunning] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);

  const doPreview = async () => {
    setRunning(true);
    try {
      const orphans = await previewOrphanGc();
      setPreview(orphans.length);
      if (orphans.length === 0) {
        toast.info("No orphans found.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setRunning(false);
    }
  };

  const doRun = async () => {
    if (!preview || preview === 0) return;
    if (
      !confirm(
        `Delete ${preview} orphaned file record${
          preview === 1 ? "" : "s"
        }? This also removes their S3 objects.`
      )
    )
      return;
    setRunning(true);
    try {
      const result = await runOrphanGc();
      toast.success(
        `Deleted ${result.deletedFileRecords} record(s) and ${result.deletedS3Keys} S3 object(s).`
      );
      setPreview(0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "GC failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clean up orphaned files</CardTitle>
        <CardDescription>
          Removes file records that aren&apos;t in any folder or album. Files
          still referenced by a page are preserved automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <Button variant="outline" onClick={doPreview} disabled={running}>
          Preview
        </Button>
        <Button
          variant="destructive"
          onClick={doRun}
          disabled={running || !preview}
        >
          <Trash2 className="mr-1 size-4" aria-hidden />
          Run cleanup
          {preview !== null && preview > 0 ? ` (${preview})` : ""}
        </Button>
      </CardContent>
    </Card>
  );
}

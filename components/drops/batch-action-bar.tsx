"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useBatchAction } from "@/hooks/use-batch-actions";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { toast } from "sonner";
import { Pin, PinOff, Trash2, X, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type BatchActionBarProps = {
  selectedIds: string[];
  onClear: () => void;
  className?: string;
};

export function BatchActionBar({
  selectedIds,
  onClear,
  className,
}: BatchActionBarProps) {
  const batchMutation = useBatchAction();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const count = selectedIds.length;

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (count === 0) return null;

  function handlePin() {
    batchMutation.mutate(
      { action: "pin", ids: selectedIds },
      {
        onSuccess: (data) => {
          toast.success(`${data.updated} item(s) pinned`);
          onClear();
        },
        onError: () => toast.error("Failed to pin items"),
      },
    );
  }

  function handleUnpin() {
    batchMutation.mutate(
      { action: "unpin", ids: selectedIds },
      {
        onSuccess: (data) => {
          toast.success(`${data.updated} item(s) unpinned`);
          onClear();
        },
        onError: () => toast.error("Failed to unpin items"),
      },
    );
  }

  function handleDelete() {
    batchMutation.mutate(
      { action: "delete", ids: selectedIds },
      {
        onSuccess: (data) => {
          toast.success(`${data.updated} item(s) moved to trash`);
          onClear();
          setConfirmDelete(false);
        },
        onError: () => {
          toast.error("Failed to delete items");
          setConfirmDelete(false);
        },
      },
    );
  }

  async function handleDownloadZip() {
    if (!activeWorkspaceId) return;

    setIsDownloading(true);
    const toastId = toast.loading(`Preparing ZIP for ${count} file(s)...`);

    try {
      const res = await fetch("/api/v1/items/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspaceId, ids: selectedIds }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message || "Export failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `drops-export-${Date.now()}.zip`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${count} file(s) as ZIP`, { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed", { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <>
      <div
        className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
          "bg-background border shadow-lg rounded-xl px-4 py-3",
          "flex items-center gap-3 animate-in slide-in-from-bottom-4",
          className,
        )}
      >
        <span className="text-sm font-medium">{count} selected</span>

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePin}
            disabled={batchMutation.isPending || isDownloading}
          >
            <Pin className="h-4 w-4 mr-1" />
            Pin All
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleUnpin}
            disabled={batchMutation.isPending || isDownloading}
          >
            <PinOff className="h-4 w-4 mr-1" />
            Unpin All
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadZip}
            disabled={batchMutation.isPending || isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1" />
            )}
            Download ZIP
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
            disabled={batchMutation.isPending || isDownloading}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>

        <div className="h-4 w-px bg-border" />

        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClear}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${count} item(s)?`}
        description="These items will be moved to trash. This action can be undone from the trash."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={batchMutation.isPending}
      />
    </>
  );
}

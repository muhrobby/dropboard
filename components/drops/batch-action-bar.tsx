"use client";

import { Button } from "@/components/ui/button";
import { useBatchAction } from "@/hooks/use-batch-actions";
import { toast } from "sonner";
import { Pin, PinOff, Trash2, X } from "lucide-react";
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
  const count = selectedIds.length;

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
    if (!confirm(`Delete ${count} item(s)? They will be moved to trash.`))
      return;
    batchMutation.mutate(
      { action: "delete", ids: selectedIds },
      {
        onSuccess: (data) => {
          toast.success(`${data.updated} item(s) moved to trash`);
          onClear();
        },
        onError: () => toast.error("Failed to delete items"),
      },
    );
  }

  return (
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
          disabled={batchMutation.isPending}
        >
          <Pin className="h-4 w-4 mr-1" />
          Pin All
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleUnpin}
          disabled={batchMutation.isPending}
        >
          <PinOff className="h-4 w-4 mr-1" />
          Unpin All
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleDelete}
          disabled={batchMutation.isPending}
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
  );
}

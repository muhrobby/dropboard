"use client";

import { useState, useMemo } from "react";
import {
  useTrashItems,
  useRestoreItem,
  usePermanentDeleteItem,
  useBatchRestoreItems,
  useBatchPermanentDeleteItems,
} from "@/hooks/use-trash";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Image as ImageIcon,
  Link as LinkIcon,
  FileText,
  Clock,
  CheckSquare,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export default function TrashPage() {
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  const { data, isLoading } = useTrashItems({ page, limit: 20 });
  const restoreMutation = useRestoreItem();
  const permanentDeleteMutation = usePermanentDeleteItem();
  const batchRestoreMutation = useBatchRestoreItems();
  const batchDeleteMutation = useBatchPermanentDeleteItems();

  const items = data?.data ?? [];
  const hasSelection = selectedIds.size > 0;
  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = hasSelection && !allSelected;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function handleRestore(id: string) {
    restoreMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Item restored");
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      },
      onError: () => toast.error("Failed to restore item"),
    });
  }

  function handlePermanentDelete(id: string) {
    if (!confirm("Are you sure? This cannot be undone.")) return;
    permanentDeleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Item permanently deleted");
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      },
      onError: () => toast.error("Failed to delete item"),
    });
  }

  function handleBatchRestore() {
    const ids = Array.from(selectedIds);
    batchRestoreMutation.mutate(ids, {
      onSuccess: (result) => {
        toast.success(`${result.restored} items restored`);
        setSelectedIds(new Set());
      },
      onError: () => toast.error("Failed to restore items"),
    });
  }

  function handleBatchDelete() {
    const ids = Array.from(selectedIds);
    batchDeleteMutation.mutate(ids, {
      onSuccess: (result) => {
        toast.success(`${result.deleted} items permanently deleted`);
        setSelectedIds(new Set());
        setShowBatchDeleteConfirm(false);
      },
      onError: () => toast.error("Failed to delete items"),
    });
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case "drop":
        return <ImageIcon className="h-4 w-4" />;
      case "link":
        return <LinkIcon className="h-4 w-4" />;
      case "note":
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  }

  function getDeletedTimeAgo(deletedAt: string | Date) {
    return formatDistanceToNow(new Date(deletedAt), { addSuffix: true });
  }

  function getDaysRemaining(deletedAt: string | Date) {
    const deleted = new Date(deletedAt);
    const permanentDeleteDate = new Date(deleted);
    permanentDeleteDate.setDate(permanentDeleteDate.getDate() + 7);
    const now = new Date();
    const daysLeft = Math.ceil(
      (permanentDeleteDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    return Math.max(0, daysLeft);
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trash2 className="h-6 w-6" />
            Trash
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Items are permanently deleted after 7 days
          </p>
        </div>
      </div>

      {/* Warning Banner */}
      <Card className="p-4 border-yellow-500/50 bg-yellow-500/10">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <div className="text-sm">
            <p className="font-medium">
              Items in trash will be permanently deleted after 7 days.
            </p>
            <p className="text-muted-foreground">
              Restore items you want to keep.
            </p>
          </div>
        </div>
      </Card>

      {/* Batch Action Bar */}
      {hasSelection && (
        <Card className="p-3 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
                className="data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground"
                {...(someSelected ? { "data-state": "indeterminate" } : {})}
              />
              <span className="text-sm font-medium">
                {selectedIds.size} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={handleBatchRestore}
                disabled={batchRestoreMutation.isPending}
                className="flex-1 sm:flex-none"
              >
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Restore Selected
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowBatchDeleteConfirm(true)}
                disabled={batchDeleteMutation.isPending}
                className="flex-1 sm:flex-none"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete Selected
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Select All Header (when no selection) */}
      {!isLoading && items.length > 0 && !hasSelection && (
        <div className="flex items-center gap-3">
          <Checkbox
            checked={false}
            onCheckedChange={toggleSelectAll}
            aria-label="Select all"
          />
          <span className="text-sm text-muted-foreground">
            Select all ({items.length} items)
          </span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2 mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && items.length === 0 && (
        <Card className="p-12 text-center">
          <Trash2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Trash is empty</h3>
          <p className="text-muted-foreground">
            Deleted items will appear here
          </p>
        </Card>
      )}

      {/* Trash Items Grid */}
      {!isLoading && items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const daysRemaining = getDaysRemaining(item.deletedAt!);
            const isSelected = selectedIds.has(item.id);
            return (
              <Card
                key={item.id}
                className={`p-4 space-y-3 transition-colors ${isSelected ? "ring-2 ring-primary bg-primary/5" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelect(item.id)}
                    aria-label={`Select ${item.title}`}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(item.type)}
                        <span className="font-medium truncate max-w-[150px]">
                          {item.title}
                        </span>
                      </div>
                      <Badge variant="outline" className="shrink-0 ml-2">
                        {item.type}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                      <Clock className="h-3 w-3" />
                      <span>Deleted {getDeletedTimeAgo(item.deletedAt!)}</span>
                      <span className="text-yellow-500">
                        • {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}{" "}
                        left
                      </span>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(item.id)}
                        disabled={restoreMutation.isPending}
                        className="flex-1"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handlePermanentDelete(item.id)}
                        disabled={permanentDeleteMutation.isPending}
                        className="flex-1"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {data && data.meta.total > data.meta.limit && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-3 text-sm text-muted-foreground">
            Page {page} of {Math.ceil(data.meta.total / data.meta.limit)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(data.meta.total / data.meta.limit)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Batch Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showBatchDeleteConfirm}
        onOpenChange={setShowBatchDeleteConfirm}
        title="Delete selected items permanently?"
        description={`You are about to permanently delete ${selectedIds.size} item${selectedIds.size > 1 ? "s" : ""}. This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        variant="destructive"
        onConfirm={handleBatchDelete}
        isPending={batchDeleteMutation.isPending}
      />
    </div>
  );
}

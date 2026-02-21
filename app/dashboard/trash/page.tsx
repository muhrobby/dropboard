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
import { PageHeader } from "@/components/patterns";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-col h-full relative">
      <header className="shrink-0 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 sticky top-0 z-20">
        <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
          <PageHeader
            title="Trash"
            description="Items are permanently deleted after 7 days"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/50 p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-24 md:pb-8">
        {/* Warning Banner */}
        <Card className="p-4 sm:p-5 border-yellow-500/30 bg-yellow-500/5 dark:bg-yellow-500/10 rounded-2xl shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-yellow-500/10 rounded-xl text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                Items in trash will be permanently deleted after 7 days.
              </p>
              <p className="text-yellow-600/80 dark:text-yellow-400/80 mt-1">
                Restore any items you want to keep before they expire.
              </p>
            </div>
          </div>
        </Card>

        {/* Batch Action Bar */}
        {hasSelection && (
          <div className="sticky top-2 z-10 animate-in slide-in-from-top-2">
            <Card className="p-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-primary/20 shadow-lg rounded-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 px-2">
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
                    className="text-muted-foreground h-8 rounded-full px-3 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
                    className="flex-1 sm:flex-none rounded-full border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm"
                  >
                    <RotateCcw className="h-4 w-4 mr-1.5" />
                    Restore Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setShowBatchDeleteConfirm(true)}
                    disabled={batchDeleteMutation.isPending}
                    className="flex-1 sm:flex-none rounded-full shadow-sm"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Delete Selected
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Select All Header (when no selection) */}
        {!isLoading && items.length > 0 && !hasSelection && (
          <div className="flex items-center gap-3 px-2">
            <Checkbox
              checked={false}
              onCheckedChange={toggleSelectAll}
              aria-label="Select all"
            />
            <span className="text-sm font-medium text-muted-foreground">
              Select all ({items.length} items)
            </span>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-5 rounded-2xl border-zinc-200/50 dark:border-zinc-800/50 shadow-sm bg-white/50 dark:bg-zinc-900/50">
                <Skeleton className="h-5 w-3/4 mb-3" />
                <Skeleton className="h-4 w-1/2 mb-5" />
                <div className="flex gap-3 mt-4">
                  <Skeleton className="h-9 w-full rounded-xl" />
                  <Skeleton className="h-9 w-full rounded-xl" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4 animate-in fade-in zoom-in-95 duration-500">
            <div className="size-20 rounded-3xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-6 shadow-sm">
              <Trash2 className="h-10 w-10 text-zinc-400 dark:text-zinc-500" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Trash is empty</h3>
            <p className="text-base text-muted-foreground max-w-sm mx-auto">
              Any items you delete will appear here and be permanently removed after 7 days.
            </p>
          </div>
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
                  className={cn(
                    "p-5 space-y-4 rounded-2xl border-zinc-200/50 dark:border-zinc-800/50 shadow-sm bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm group hover:-translate-y-0.5 transition-all duration-300 overflow-hidden relative",
                    isSelected && "ring-2 ring-primary border-transparent bg-primary/5 dark:bg-primary/10"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(item.id)}
                      aria-label={`Select ${item.title}`}
                      className="mt-1 transition-transform group-hover:scale-110"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
                            {getTypeIcon(item.type)}
                          </div>
                          <span className="font-medium truncate text-[15px] group-hover:text-primary transition-colors">
                            {item.title}
                          </span>
                        </div>
                        <Badge variant="secondary" className="shrink-0 rounded-md font-medium px-2 py-0.5 capitalize bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs text-zinc-600 dark:text-zinc-300">
                          {item.type}
                        </Badge>
                      </div>

                      <div className="flex flex-col gap-1.5 text-[13px] text-muted-foreground mt-3">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Deleted {getDeletedTimeAgo(item.deletedAt!)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-500 font-medium">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>{daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left</span>
                        </div>
                      </div>

                      <div className="flex gap-2.5 mt-5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestore(item.id)}
                          disabled={restoreMutation.isPending}
                          className="flex-1 rounded-xl h-9 text-[13px] font-medium border-zinc-200 dark:border-zinc-800 bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900 shadow-sm"
                        >
                          <RotateCcw className="h-4 w-4 mr-1.5" />
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handlePermanentDelete(item.id)}
                          disabled={permanentDeleteMutation.isPending}
                          className="flex-1 rounded-xl h-9 text-[13px] font-medium shadow-sm"
                        >
                          <Trash2 className="h-4 w-4 mr-1.5" />
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
          <div className="flex justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-full px-5 shadow-sm"
            >
              Previous
            </Button>
            <div className="flex items-center px-4 text-sm font-medium text-muted-foreground bg-white/50 dark:bg-zinc-900/50 rounded-full border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-sm shadow-sm">
              Page {page} of {Math.ceil(data.meta.total / data.meta.limit)}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(data.meta.total / data.meta.limit)}
              className="rounded-full px-5 shadow-sm"
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
    </div>
  );
}

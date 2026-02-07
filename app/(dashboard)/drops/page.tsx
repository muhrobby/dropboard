"use client";

import { useState, useMemo } from "react";
import { ImageDown, Upload, Plus, Folder, Clock, AlertTriangle, Files } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { DropCard } from "@/components/drops/drop-card";
import { UploadModal } from "@/components/drops/upload-modal";
import { useUIStore } from "@/stores/ui-store";
import { useItems } from "@/hooks/use-items";
import type { ItemResponse } from "@/types/api";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "images" | "files";
type PinFilter = "all" | "pinned" | "temporary";

function isImageItem(item: ItemResponse): boolean {
  return item.fileAsset?.mimeType?.startsWith("image/") ?? false;
}

function groupByDate(items: ItemResponse[]): Record<string, ItemResponse[]> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups: Record<string, ItemResponse[]> = {
    Today: [],
    "This Week": [],
    Earlier: [],
  };

  for (const item of items) {
    const created = new Date(item.createdAt);
    if (created >= today) {
      groups["Today"].push(item);
    } else if (created >= weekAgo) {
      groups["This Week"].push(item);
    } else {
      groups["Earlier"].push(item);
    }
  }

  return groups;
}

function getDaysRemaining(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function StatCard({
  icon,
  label,
  value,
  subtext,
  color,
  bgColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
  bgColor: string;
}) {
  const Icon = icon;
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={cn("flex items-center justify-center w-12 h-12 rounded-xl", bgColor)}>
          <Icon className={cn("w-6 h-6", color)} />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtext && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function DropsPage() {
  const setUploadModalOpen = useUIStore((s) => s.setUploadModalOpen);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [pinFilter, setPinFilter] = useState<PinFilter>("all");

  const { data, isLoading } = useItems({ type: "drop" });
  const items = data?.data ?? [];

  const filteredItems = useMemo(() => {
    let result = items;

    // Filter by type
    if (filterTab === "images") {
      result = result.filter(isImageItem);
    } else if (filterTab === "files") {
      result = result.filter((item) => !isImageItem(item));
    }

    // Filter by pin status
    if (pinFilter === "pinned") {
      result = result.filter((item) => item.isPinned);
    } else if (pinFilter === "temporary") {
      result = result.filter((item) => !item.isPinned);
    }

    return result;
  }, [items, filterTab, pinFilter]);

  const grouped = useMemo(() => groupByDate(filteredItems), [filteredItems]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalFiles = items.length;
    const totalSize = items.reduce((sum, item) => sum + (item.fileAsset?.sizeBytes || 0), 0);
    const totalImages = items.filter(isImageItem).length;
    const pinnedCount = items.filter((item) => item.isPinned).length;

    // Files expiring soon (within 1-7 days)
    let expiringSoon = 0;
    let expiringToday = 0;
    const expiryCounts: Record<number, number> = {};

    items.forEach((item) => {
      if (item.isPinned) return; // Pinned items don't expire

      const daysRemaining = getDaysRemaining(item.expiresAt);
      if (daysRemaining !== null) {
        if (daysRemaining <= 1) {
          expiringToday++;
        }
        if (daysRemaining <= 3 && daysRemaining > 0) {
          expiringSoon++;
        }
        expiryCounts[daysRemaining] = (expiryCounts[daysRemaining] || 0) + 1;
      }
    });

    return {
      totalFiles,
      totalSize,
      totalImages,
      pinnedCount,
      expiringToday,
      expiringSoon,
      expiryCounts,
    };
  }, [items]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Drops</h1>
        <Button onClick={() => setUploadModalOpen(true)} className="hidden sm:flex">
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>
      </div>

      {/* Statistics Cards */}
      {!isLoading && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in slide-in-from-bottom-2">
          <StatCard
            icon={Files}
            label="Total Files"
            value={stats.totalFiles}
            subtext={`${stats.totalImages} images`}
            color="text-blue-500"
            bgColor="bg-blue-500/10"
          />
          <StatCard
            icon={Folder}
            label="Storage Used"
            value={formatBytes(stats.totalSize)}
            color="text-purple-500"
            bgColor="bg-purple-500/10"
          />
          <StatCard
            icon={Clock}
            label="Expiring Soon"
            value={stats.expiringSoon}
            subtext={stats.expiringToday > 0 ? `${stats.expiringToday} today` : "Next 3 days"}
            color="text-orange-500"
            bgColor="bg-orange-500/10"
          />
          <StatCard
            icon={AlertTriangle}
            label="Permanent Files"
            value={stats.pinnedCount}
            subtext={`${stats.totalFiles - stats.pinnedCount} temporary`}
            color="text-green-500"
            bgColor="bg-green-500/10"
          />
        </div>
      )}

      {/* Expiring Soon Alert */}
      {!isLoading && stats.expiringToday > 0 && (
        <div className="relative overflow-hidden rounded-xl border border-orange-500/50 bg-orange-500/5 p-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500/20">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                {stats.expiringToday} file{stats.expiringToday > 1 ? "s" : ""} expiring today!
              </p>
              <p className="text-xs text-muted-foreground">
                These files will be automatically deleted. Pin them to keep permanently.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Tabs
            value={filterTab}
            onValueChange={(v) => setFilterTab(v as FilterTab)}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
            </TabsList>
          </Tabs>

          <Tabs
            value={pinFilter}
            onValueChange={(v) => setPinFilter(v as PinFilter)}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pinned">Pinned</TabsTrigger>
              <TabsTrigger value="temporary">Temporary</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-6">
          {/* Stats skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl border">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Cards skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && items.length === 0 && (
        <EmptyState
          icon={ImageDown}
          title="Drop your first file"
          description="Upload images, documents, or any files. Temporary drops expire in 7 days, or pin them to keep forever."
          actionLabel="Upload a file"
          onAction={() => setUploadModalOpen(true)}
        />
      )}

      {/* Empty filtered results */}
      {!isLoading && items.length > 0 && filteredItems.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No items match the current filters.
        </div>
      )}

      {/* Items grouped by date */}
      {!isLoading &&
        filteredItems.length > 0 &&
        Object.entries(grouped).map(
          ([label, groupItems]) =>
            groupItems.length > 0 && (
              <div key={label} className="mb-6">
                <h2 className="text-sm font-medium text-muted-foreground mb-3">
                  {label}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {groupItems.map((item) => (
                    <DropCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )
        )}

      {/* Mobile FAB */}
      <Button
        size="icon"
        className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg sm:hidden"
        onClick={() => setUploadModalOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Upload Modal */}
      <UploadModal />
    </div>
  );
}

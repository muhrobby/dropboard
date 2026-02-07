"use client";

import { useState, useMemo } from "react";
import { ImageDown, Upload, Plus, Folder, FolderOpen, Clock, AlertTriangle, Files, ChevronRight } from "lucide-react";
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
import { formatBytes, getDaysRemaining } from "@/components/drops/drops-page-utils";

type FilterTab = "all" | "images" | "files";
type PinFilter = "all" | "pinned" | "temporary";

interface FolderGroup {
  name: string;
  items: ItemResponse[];
  createdAt: string;
}

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

// Extract folder name from title (format: "Folder Name/FileName" or "Folder Name (+N more)")
function extractFolderName(title: string | null): string | null {
  if (!title) return null;
  const match = title.match(/^([^/]+?)(?:\/|\s\(\+\d+\s+more\))$/);
  return match ? match[1] : null;
}

// Group items by folder name
function groupByFolders(items: ItemResponse[]): { folders: FolderGroup[]; singles: ItemResponse[] } {
  const folderMap = new Map<string, ItemResponse[]>();
  const singles: ItemResponse[] = [];

  for (const item of items) {
    const folderName = extractFolderName(item.title);
    if (folderName) {
      if (!folderMap.has(folderName)) {
        folderMap.set(folderName, []);
      }
      folderMap.get(folderName)!.push(item);
    } else {
      singles.push(item);
    }
  }

  const folders: FolderGroup[] = Array.from(folderMap.entries()).map(([name, items]) => ({
    name,
    items,
    createdAt: items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0].createdAt,
  }));

  // Sort folders by creation date
  folders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { folders, singles };
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

function FolderCard({ folder }: { folder: FolderGroup }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const itemCount = folder.items.length;
  const totalSize = folder.items.reduce((sum, item) => sum + (item.fileAsset?.sizeBytes || 0), 0);
  const imageCount = folder.items.filter(isImageItem).length;

  // Get earliest expiry date in folder
  let minExpiryDays: number | null = null;
  for (const item of folder.items) {
    const days = getDaysRemaining(item.expiresAt);
    if (days !== null) {
      if (minExpiryDays === null || days < minExpiryDays) {
        minExpiryDays = days;
      }
    }
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
      >
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
          isExpanded ? "bg-primary/20 text-primary" : "bg-muted"
        )}>
          {isExpanded ? <FolderOpen className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{folder.name}</h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {itemCount} file{itemCount > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatBytes(totalSize)}</span>
            {imageCount > 0 && (
              <span>{imageCount} image{imageCount > 1 ? "s" : ""}</span>
            )}
            {minExpiryDays !== null && minExpiryDays <= 7 && (
              <span className={cn(
                "flex items-center gap-1",
                minExpiryDays <= 1 ? "text-orange-500" : "text-yellow-600"
              )}>
                <Clock className="w-3 h-3" />
                Expires in {minExpiryDays} day{minExpiryDays > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <ChevronRight className={cn(
          "w-5 h-5 text-muted-foreground transition-transform",
          isExpanded && "rotate-90"
        )} />
      </button>

      {isExpanded && (
        <div className="border-t p-4 bg-muted/20">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {folder.items.map((item) => (
              <DropCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function DropsPage() {
  const setUploadModalOpen = useUIStore((s) => s.setUploadModalOpen);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [pinFilter, setPinFilter] = useState<PinFilter>("all");
  const [viewMode, setViewMode] = useState<"grid" | "folder">("folder");

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

  // Group by folders or date
  const { folders, singles } = useMemo(() => groupByFolders(filteredItems), [filteredItems]);
  const groupedByDate = useMemo(() => groupByDate(singles), [singles]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalFiles = items.length;
    const totalSize = items.reduce((sum, item) => sum + (item.fileAsset?.sizeBytes || 0), 0);
    const totalImages = items.filter(isImageItem).length;
    const pinnedCount = items.filter((item) => item.isPinned).length;

    // Count folders
    const folderCount = new Set(
      items
        .map((item) => extractFolderName(item.title))
        .filter((name): name is string => name !== null)
    ).size;

    // Files expiring soon
    let expiringSoon = 0;
    let expiringToday = 0;

    items.forEach((item) => {
      if (item.isPinned) return;
      const daysRemaining = getDaysRemaining(item.expiresAt);
      if (daysRemaining !== null) {
        if (daysRemaining <= 1) expiringToday++;
        if (daysRemaining <= 3 && daysRemaining > 0) expiringSoon++;
      }
    });

    return {
      totalFiles,
      totalSize,
      totalImages,
      pinnedCount,
      folderCount,
      expiringToday,
      expiringSoon,
    };
  }, [items]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Drops</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "folder" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("folder")}
            className="gap-2"
          >
            <Folder className="w-4 h-4" />
            Folders
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="gap-2"
          >
            <Files className="w-4 h-4" />
            Grid
          </Button>
          <Button onClick={() => setUploadModalOpen(true)} className="hidden sm:flex">
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
        </div>
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
            label={viewMode === "folder" ? "Folders" : "Storage Used"}
            value={viewMode === "folder" ? stats.folderCount : formatBytes(stats.totalSize)}
            subtext={viewMode === "folder" ? `${stats.totalFiles - stats.folderCount * 2} files` : `${stats.pinnedCount} pinned`}
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

      {/* Folder View */}
      {!isLoading && filteredItems.length > 0 && viewMode === "folder" && (
        <div className="space-y-4">
          {folders.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Folders ({folders.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {folders.map((folder) => (
                  <FolderCard key={folder.name} folder={folder} />
                ))}
              </div>
            </div>
          )}

          {singles.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Individual Files ({singles.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {singles.map((item) => (
                  <DropCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Date grouped singles */}
          {Object.entries(groupedByDate).map(
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
        </div>
      )}

      {/* Grid View */}
      {!isLoading && filteredItems.length > 0 && viewMode === "grid" && (
        <>
          {Object.entries(groupedByDate).map(
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
        </>
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

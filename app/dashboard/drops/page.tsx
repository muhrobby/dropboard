"use client";

import { useState, useMemo, useCallback } from "react";
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import {
  Upload,
  ImageDown,
  Plus,
  Folder,
  FolderOpen,
  Clock,
  AlertTriangle,
  Files,
  ChevronRight,
  Grid3x3,
  List,
  Search,
  SortAsc,
  MoreVertical,
  File,
  Image as ImageIcon,
  FileText,
  Archive,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState } from "@/components/shared/empty-state";
import { DropCard } from "@/components/drops/drop-card";
import { UploadModal } from "@/components/drops/upload-modal";
import { BatchActionBar } from "@/components/drops/batch-action-bar";
import { MediaViewer } from "@/components/drops/media-viewer";
import { DropDetailSheet } from "@/components/drops/drop-detail-sheet";
import { CollectionsSidebar } from "@/components/drops/collections-sidebar";
import { Checkbox } from "@/components/ui/checkbox";
import { useUIStore } from "@/stores/ui-store";
import { useItems } from "@/hooks/use-items";
import { useMoveItemToCollection } from "@/hooks/use-collections";
import type { ItemResponse } from "@/types/api";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  formatBytes,
  getDaysRemaining,
} from "@/components/drops/drops-page-utils";
import { Input } from "@/components/ui/input";
import { PageHeader, MetricCard } from "@/components/patterns";
import { toast } from "sonner";

type ViewMode = "grid" | "list";
type SortBy = "name" | "date" | "size";
type FilterTab = "all" | "images" | "files";
type PinFilter = "all" | "pinned" | "temporary";

interface BreadcrumbItem {
  name: string;
  folderId: string | null;
}

interface DriveFolder {
  id: string;
  name: string;
  itemCount: number;
  totalSize: number;
  createdAt: string;
}

interface DriveItem {
  type: "folder" | "file";
  id: string;
  name: string;
  item?: ItemResponse;
  folder?: DriveFolder;
}

function isImageItem(item: ItemResponse): boolean {
  return item.fileAsset?.mimeType?.startsWith("image/") ?? false;
}

// File icon for list view
function getFileIcon(mimeType: string): React.ElementType {
  if (!mimeType) return File;
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType === "application/pdf") return FileText;
  if (mimeType.includes("word") || mimeType.includes("document"))
    return FileText;
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return FileText;
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return FileText;
  if (mimeType.includes("zip") || mimeType.includes("archive")) return Archive;
  if (mimeType.startsWith("text/")) return FileText;
  return File;
}

function getFileColor(mimeType: string): string {
  if (!mimeType) return "text-gray-500";
  if (mimeType.startsWith("image/")) return "text-purple-500";
  if (mimeType === "application/pdf") return "text-red-500";
  if (mimeType.includes("sheet") || mimeType.includes("excel"))
    return "text-green-500";
  if (mimeType.includes("word") || mimeType.includes("document"))
    return "text-blue-500";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return "text-orange-500";
  if (mimeType.includes("zip") || mimeType.includes("archive"))
    return "text-yellow-600";
  return "text-gray-500";
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
    <Card className="relative overflow-hidden group border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 hover:border-primary/30">
      <div className="flex items-start gap-4 relative z-10">
        <div
          className={cn(
            "flex items-center justify-center size-12 rounded-2xl transition-transform duration-300 group-hover:scale-110 shadow-sm",
            bgColor,
          )}
        >
          <Icon className={cn("size-6", color)} />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight text-foreground tabular-nums leading-none">{value}</p>
          {subtext && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{subtext}</p>
          )}
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-primary/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </Card>
  );
}

export default function DropsPage() {
  const setUploadModalOpen = useUIStore((s) => s.setUploadModalOpen);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [pinFilter, setPinFilter] = useState<PinFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Media preview state
  const [previewItem, setPreviewItem] = useState<ItemResponse | null>(null);
  // Detail sheet state
  const [detailItem, setDetailItem] = useState<ItemResponse | null>(null);
  // Collection filter — null = "All Files"
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  // Mobile collections sheet
  const [showCollectionsSheet, setShowCollectionsSheet] = useState(false);

  const { data, isLoading } = useItems({ type: "drop" });
  const allItems = data?.data ?? [];
  const moveItem = useMoveItemToCollection();

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  // Handle drag end: item dropped on a collection node
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      // active.id = "item:<itemId>", over.id = "collection:<collectionId|null>"
      const activeStr = String(active.id);
      const overStr = String(over.id);

      if (!activeStr.startsWith("item:") || !overStr.startsWith("collection:")) return;

      const itemId = activeStr.replace("item:", "");
      const collectionIdRaw = overStr.replace("collection:", "");
      const collectionId = collectionIdRaw === "null" ? null : collectionIdRaw;

      // Find item to get current collectionId
      const item = allItems.find((i) => i.id === itemId);
      if (!item) return;
      if (item.collectionId === collectionId) return; // no change

      moveItem.mutate(
        { itemId, collectionId },
        {
          onSuccess: () => toast.success("Moved to collection"),
          onError: () => toast.error("Failed to move item"),
        },
      );
    },
    [allItems, moveItem],
  );

  // Filter items by selected collection
  const collectionFilteredItems = useMemo(() => {
    if (selectedCollectionId === null) return allItems;
    return allItems.filter((item) => item.collectionId === selectedCollectionId);
  }, [allItems, selectedCollectionId]);

  // Apply type/pin/search/sort filters on top of collection filter
  const currentFiles = useMemo(() => {
    let files = [...collectionFilteredItems];

    if (filterTab === "images") {
      files = files.filter(isImageItem);
    } else if (filterTab === "files") {
      files = files.filter((item) => !isImageItem(item));
    }

    if (pinFilter === "pinned") {
      files = files.filter((item) => item.isPinned);
    } else if (pinFilter === "temporary") {
      files = files.filter((item) => !item.isPinned);
    }

    if (searchQuery) {
      files = files.filter((item) =>
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    files.sort((a, b) => {
      if (sortBy === "name") {
        return (a.title || "").localeCompare(b.title || "");
      } else if (sortBy === "date") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      } else if (sortBy === "size") {
        return (b.fileAsset?.sizeBytes || 0) - (a.fileAsset?.sizeBytes || 0);
      }
      return 0;
    });

    return files;
  }, [
    collectionFilteredItems,
    filterTab,
    pinFilter,
    searchQuery,
    sortBy,
  ]);

  // Drive items (files only, no legacy folder logic)
  const driveItems: DriveItem[] = useMemo(
    () =>
      currentFiles.map((file) => ({
        type: "file",
        id: file.id,
        name: file.title || "Untitled",
        item: file,
      })),
    [currentFiles],
  );

  // Calculate statistics
  const stats = useMemo(() => {
    const totalFiles = allItems.length;
    const totalSize = allItems.reduce(
      (sum, item) => sum + (item.fileAsset?.sizeBytes || 0),
      0,
    );
    const totalImages = allItems.filter(isImageItem).length;
    const pinnedCount = allItems.filter((item) => item.isPinned).length;

    let expiringSoon = 0;
    let expiringToday = 0;

    allItems.forEach((item) => {
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
      expiringToday,
      expiringSoon,
    };
  }, [allItems]);

  // Selection helpers
  function toggleSelection(id: string) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  }

  function selectAll() {
    const allFileIds = currentFiles.map((f) => f.id);
    setSelectedIds(new Set(allFileIds));
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-full overflow-hidden">
        {/* Collections sidebar */}
        <CollectionsSidebar
          selectedCollectionId={selectedCollectionId}
          onSelectCollection={(id) => {
            setSelectedCollectionId(id);
            clearSelection();
          }}
          className="hidden lg:flex border-r border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 overflow-y-auto shrink-0"
        />

        {/* Main content */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Header */}
          <div className="border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-20">
            <div className="p-4 md:p-6 lg:px-8 space-y-5 max-w-7xl mx-auto">
              <PageHeader
                title="Drops"
                description="Securely upload, organize, and manage your workspace files."
              >
                <Button onClick={() => setUploadModalOpen(true, selectedCollectionId)} className="rounded-xl shadow-sm hover:shadow-md transition-all group">
                  <Upload className="size-4 mr-2 transition-transform group-hover:-translate-y-0.5" />
                  Upload Files
                </Button>
              </PageHeader>

              {/* Mobile collections button — hidden on lg+ where sidebar is visible */}
              <Button
                variant="outline"
                className="lg:hidden w-full justify-start rounded-xl border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                onClick={() => setShowCollectionsSheet(true)}
              >
                {selectedCollectionId ? (
                  <FolderOpen className="size-4 mr-2 text-primary" />
                ) : (
                  <Folder className="size-4 mr-2" />
                )}
                <span>Folders</span>
                {selectedCollectionId && (
                  <span className="ml-auto size-2 rounded-full bg-primary shrink-0" />
                )}
              </Button>

              {/* Search and filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-center w-full">
                <div className="relative w-full sm:w-64 group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200/50 dark:border-zinc-800/50 focus-visible:ring-primary/20 transition-all w-full"
                  />
                </div>
                <Tabs
                  value={filterTab}
                  onValueChange={(v) => setFilterTab(v as FilterTab)}
                  className="w-full sm:w-auto"
                >
                  <TabsList className="h-10 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl w-full grid grid-cols-3 sm:flex">
                    <TabsTrigger value="all" className="rounded-lg text-xs font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm">All</TabsTrigger>
                    <TabsTrigger value="images" className="rounded-lg text-xs font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm">Images</TabsTrigger>
                    <TabsTrigger value="files" className="rounded-lg text-xs font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm">Files</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto bg-zinc-50/50 dark:bg-zinc-950/50 scroll-smooth">
            <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
              {/* Statistics Cards */}
              {!isLoading && allItems.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                  <StatCard
                    icon={Files}
                    label="Total Files"
                    value={stats.totalFiles}
                    subtext={`${stats.totalImages} images`}
                    color="text-indigo-600 dark:text-indigo-400"
                    bgColor="bg-indigo-500/10"
                  />
                  <StatCard
                    icon={Folder}
                    label="In Collection"
                    value={allItems.filter((i) => i.collectionId !== null).length}
                    subtext="Organized files"
                    color="text-violet-600 dark:text-violet-400"
                    bgColor="bg-violet-500/10"
                  />
                  <StatCard
                    icon={Clock}
                    label="Expiring Soon"
                    value={stats.expiringSoon}
                    subtext={
                      stats.expiringToday > 0
                        ? `${stats.expiringToday} today`
                        : "Next 3 days"
                    }
                    color="text-amber-600 dark:text-amber-400"
                    bgColor="bg-amber-500/10"
                  />
                  <StatCard
                    icon={AlertTriangle}
                    label="Storage Used"
                    value={formatBytes(stats.totalSize)}
                    subtext={`${stats.pinnedCount} pinned`}
                    color="text-emerald-600 dark:text-emerald-400"
                    bgColor="bg-emerald-500/10"
                  />
                </div>
              )}

              {/* Expiring Alert */}
              {!isLoading && stats.expiringToday > 0 && (
                <div className="relative overflow-hidden rounded-2xl border border-rose-500/30 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/5 p-5 shadow-sm animate-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="flex items-center justify-center size-12 shrink-0 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="size-6 animate-pulse" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-base font-semibold text-rose-700 dark:text-rose-400 tracking-tight">
                        {stats.expiringToday} file
                        {stats.expiringToday > 1 ? "s are" : " is"} expiring today!
                      </p>
                      <p className="text-sm text-rose-600/80 dark:text-rose-400/80 leading-relaxed">
                        These unpinned files will be permanently deleted. Pin them or download to keep them.
                      </p>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 p-32 bg-rose-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}

              {/* Toolbar */}
              {driveItems.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2">
                  <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-xl px-4 py-2 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
                    {selectionMode && (
                      <Button size="sm" variant="ghost" onClick={selectAll} className="h-7 text-xs font-semibold rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                        Select All ({currentFiles.length})
                      </Button>
                    )}
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {selectedIds.size > 0 ? (
                        <span className="text-primary">{selectedIds.size} selected</span>
                      ) : (
                        <span className="text-muted-foreground">{driveItems.length} item{driveItems.length !== 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center border border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-900 rounded-xl p-1 shadow-sm">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={cn(
                          "p-2 rounded-lg transition-all duration-200",
                          viewMode === "grid"
                            ? "bg-zinc-100 dark:bg-zinc-800 text-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-foreground",
                        )}
                      >
                        <Grid3x3 className="size-4" />
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={cn(
                          "p-2 rounded-lg transition-all duration-200",
                          viewMode === "list"
                            ? "bg-zinc-100 dark:bg-zinc-800 text-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-foreground",
                        )}
                      >
                        <List className="size-4" />
                      </button>
                    </div>
                    <div className="relative flex items-center border border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-900 rounded-xl shadow-sm overflow-hidden group hover:border-primary/30 transition-colors">
                      <SortAsc className="absolute left-3 size-4 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" />
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortBy)}
                        className="text-sm font-medium border-0 px-3 py-2.5 pl-9 bg-transparent focus:ring-0 outline-none appearance-none cursor-pointer w-28 text-foreground"
                      >
                        <option value="date" className="bg-background">Newest</option>
                        <option value="name" className="bg-background">Name</option>
                        <option value="size" className="bg-background">Size</option>
                      </select>
                    </div>
                    <Button
                      variant={selectionMode ? "default" : "outline"}
                      className={cn(
                        "rounded-xl shadow-sm transition-all duration-300",
                        selectionMode ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-white dark:bg-zinc-900 border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      )}
                      onClick={() => {
                        if (selectionMode) clearSelection();
                        else setSelectionMode(true);
                      }}
                    >
                      <CheckSquare className={cn("size-4 transition-transform", selectionMode && "scale-110")} />
                      <span className="ml-2 font-semibold">
                        {selectionMode ? "Done" : "Select"}
                      </span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Loading state */}
              {isLoading && (
                <div className="space-y-4 animate-in fade-in duration-500">
                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="space-y-3">
                          <Skeleton className="aspect-square w-full rounded-2xl" />
                          <div className="space-y-1.5 px-1">
                            <Skeleton className="h-4 w-3/4 rounded-md" />
                            <Skeleton className="h-3 w-1/2 rounded-md" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                          <Skeleton className="size-10 rounded-xl" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-1/3 rounded-md" />
                            <Skeleton className="h-3 w-1/4 rounded-md sm:hidden" />
                          </div>
                          <Skeleton className="h-4 w-24 rounded-md hidden sm:block" />
                          <Skeleton className="h-4 w-16 rounded-md hidden sm:block" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Empty state */}
              {!isLoading && driveItems.length === 0 && (
                <EmptyState
                  icon={selectedCollectionId ? Folder : ImageDown}
                  title={selectedCollectionId ? "Empty collection" : "Drop your first file"}
                  description={
                    selectedCollectionId
                      ? "Drag files here to organize them into this collection."
                      : "Upload images, documents, or any files. Temporary drops expire in 7 days, or pin them to keep forever."
                  }
                  actionLabel="Upload a file"
                  onAction={() => setUploadModalOpen(true, selectedCollectionId)}
                />
              )}

              {/* Grid View */}
              {!isLoading && driveItems.length > 0 && viewMode === "grid" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 animate-in fade-in duration-500">
                  {driveItems.map((driveItem) => {
                    const item = driveItem.item!;
                    const isSelected = selectedIds.has(item.id);
                    return (
                      <div key={driveItem.id} className="relative group">
                        {selectionMode && (
                          <div
                            className={cn(
                              "absolute top-3 right-3 z-10 cursor-pointer transition-all duration-200",
                              isSelected
                                ? "opacity-100 scale-100"
                                : "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100",
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelection(item.id);
                            }}
                          >
                            <div
                              className={cn(
                                "size-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 shadow-sm backdrop-blur-sm",
                                isSelected
                                  ? "bg-primary border-primary text-primary-foreground scale-110"
                                  : "bg-white/80 dark:bg-zinc-900/80 border-zinc-300 dark:border-zinc-700 hover:border-primary",
                              )}
                            >
                              <CheckSquare className={cn("size-3.5 transition-opacity", isSelected ? "opacity-100" : "opacity-0")} />
                            </div>
                          </div>
                        )}
                        <div
                          className={cn(
                            "transition-all duration-300 rounded-2xl h-full",
                            selectionMode && isSelected && "ring-2 ring-primary ring-offset-2 scale-[0.98]",
                            selectionMode && !isSelected && "hover:scale-[0.99] opacity-80 hover:opacity-100"
                          )}
                          onClick={
                            selectionMode
                              ? () => toggleSelection(item.id)
                              : undefined
                          }
                        >
                          <DropCard item={item} onPreview={selectionMode ? undefined : setPreviewItem} onDetails={selectionMode ? undefined : setDetailItem} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* List View */}
              {!isLoading && driveItems.length > 0 && viewMode === "list" && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-500">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-zinc-50/50 dark:bg-zinc-950/50 text-[13px] font-semibold text-muted-foreground border-b border-zinc-200/50 dark:border-zinc-800/50 uppercase tracking-wider">
                    <div className="col-span-6 md:col-span-7">Name</div>
                    <div className="col-span-3 md:col-span-2">Modified</div>
                    <div className="col-span-2">Size</div>
                    <div className="col-span-1"></div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                    {driveItems.map((driveItem) => {
                      const item = driveItem.item!;
                      const FileIcon = getFileIcon(item.fileAsset?.mimeType || "");
                      const iconColor = getFileColor(item.fileAsset?.mimeType || "");
                      const fileSize = item.fileAsset?.sizeBytes || 0;

                      return (
                        <button
                          key={driveItem.id}
                          onClick={() => setPreviewItem(item)}
                          className="w-full grid grid-cols-12 gap-4 px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left group"
                        >
                          <div className="col-span-6 md:col-span-7 flex items-center gap-4">
                            <div className="size-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-sm">
                              <FileIcon className={cn("size-5", iconColor)} />
                            </div>
                            <div className="min-w-0 flex flex-col">
                              <p className="truncate font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
                                {item.title}
                              </p>
                              <p className="text-xs text-muted-foreground truncate sm:hidden mt-0.5">
                                {formatBytes(fileSize)} • {new Date(item.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="hidden sm:flex col-span-3 md:col-span-2 items-center text-sm font-medium text-muted-foreground">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </div>
                          <div className="hidden sm:flex col-span-2 items-center text-sm font-medium text-muted-foreground tabular-nums">
                            {formatBytes(fileSize)}
                          </div>
                          <div className="col-span-6 sm:col-span-1 flex items-center justify-end">
                            <Button variant="ghost" size="icon" className="size-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="size-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Upload Modal */}
          <UploadModal />

          {/* Batch Action Bar */}
          <BatchActionBar
            selectedIds={Array.from(selectedIds)}
            onClear={clearSelection}
          />

          {/* Media Viewer */}
          <MediaViewer
            item={previewItem}
            items={currentFiles}
            open={!!previewItem}
            onOpenChange={(o) => { if (!o) setPreviewItem(null); }}
            onNavigate={setPreviewItem}
          />

          {/* Drop Detail Sheet */}
          <DropDetailSheet
            item={detailItem}
            open={!!detailItem}
            onOpenChange={(o) => { if (!o) setDetailItem(null); }}
            onOpenPreview={() => {
              if (detailItem) {
                setPreviewItem(detailItem);
                setDetailItem(null);
              }
            }}
          />
        </div>
      </div>

      {/* Mobile collections Sheet */}
      <Sheet open={showCollectionsSheet} onOpenChange={setShowCollectionsSheet}>
        <SheetContent side="left" className="p-0 w-72 sm:w-80 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b border-zinc-200/50 dark:border-zinc-800/50 shrink-0">
            <SheetTitle className="text-sm font-semibold">Folders</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            <CollectionsSidebar
              selectedCollectionId={selectedCollectionId}
              onSelectCollection={(id) => {
                setSelectedCollectionId(id);
                clearSelection();
                setShowCollectionsSheet(false);
              }}
              className="w-full"
            />
          </div>
        </SheetContent>
      </Sheet>
    </DndContext>
  );
}

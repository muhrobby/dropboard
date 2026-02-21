"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
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
import { EmptyState } from "@/components/shared/empty-state";
import { DropCard } from "@/components/drops/drop-card";
import { UploadModal } from "@/components/drops/upload-modal";
import { BatchActionBar } from "@/components/drops/batch-action-bar";
import { Checkbox } from "@/components/ui/checkbox";
import { useUIStore } from "@/stores/ui-store";
import { useItems } from "@/hooks/use-items";
import type { ItemResponse } from "@/types/api";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  formatBytes,
  getDaysRemaining,
} from "@/components/drops/drops-page-utils";
import { Input } from "@/components/ui/input";
import { PageHeader, MetricCard } from "@/components/patterns";

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

// Extract folder info dari items
function buildDriveStructure(items: ItemResponse[]): {
  folders: DriveFolder[];
  fileMap: Map<string, ItemResponse[]>;
} {
  const folderMap = new Map<string, ItemResponse[]>();
  const folders: DriveFolder[] = [];

  // Group items by folder
  for (const item of items) {
    const folderMatch = item.title?.match(
      /^([^/]+?)(?:\/|\s\(\+\d+\s+more\))$/,
    );
    const folderName = folderMatch ? folderMatch[1] : null;

    if (folderName) {
      if (!folderMap.has(folderName)) {
        folderMap.set(folderName, []);
        folders.push({
          id: folderName,
          name: folderName,
          itemCount: 0,
          totalSize: 0,
          createdAt: item.createdAt,
        });
      }
      folderMap.get(folderName)!.push(item);
    }
  }

  // Calculate folder stats
  for (const [folderName, folderItems] of folderMap.entries()) {
    const folder = folders.find((f) => f.name === folderName);
    if (folder) {
      folder.itemCount = folderItems.length;
      folder.totalSize = folderItems.reduce(
        (sum, item) => sum + (item.fileAsset?.sizeBytes || 0),
        0,
      );
    }
  }

  // Sort folders by name
  folders.sort((a, b) => a.name.localeCompare(b.name));

  return { folders, fileMap: folderMap };
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

// File icon untuk list view
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

export default function DropsPage() {
  const setUploadModalOpen = useUIStore((s) => s.setUploadModalOpen);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [pinFilter, setPinFilter] = useState<PinFilter>("all");
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { name: "Drops", folderId: null },
  ]);
  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data, isLoading } = useItems({ type: "drop" });
  const allItems = data?.data ?? [];

  // Build drive structure
  const { folders, fileMap } = useMemo(
    () => buildDriveStructure(allItems),
    [allItems],
  );

  // Get current content based on folder selection
  const currentFolders = useMemo(() => {
    if (currentFolder) {
      // If inside a folder, show subfolders (none for now - single level)
      return [];
    }
    return folders;
  }, [folders, currentFolder]);

  const currentFiles = useMemo(() => {
    let files: ItemResponse[] = [];

    if (currentFolder) {
      // Show files in selected folder
      files = fileMap.get(currentFolder) ?? [];
    } else {
      // Show files not in any folder
      files = allItems.filter(
        (item) => !item.title?.match(/^([^/]+?)(?:\/|\s\(\+\d+\s+more\))$/),
      );
    }

    // Apply filters
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

    // Apply search
    if (searchQuery) {
      files = files.filter((item) =>
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Sort
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
    allItems,
    fileMap,
    currentFolder,
    filterTab,
    pinFilter,
    searchQuery,
    sortBy,
  ]);

  // Combine folders and files for display
  const driveItems: DriveItem[] = useMemo(() => {
    const items: DriveItem[] = [];

    // Add folders
    for (const folder of currentFolders) {
      items.push({
        type: "folder",
        id: folder.id,
        name: folder.name,
        folder,
      });
    }

    // Add files
    for (const file of currentFiles) {
      items.push({
        type: "file",
        id: file.id,
        name: file.title || "Untitled",
        item: file,
      });
    }

    // Sort items (folders first, then by sort option)
    items.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;

      if (a.type === "folder" && b.type === "folder") {
        return a.name.localeCompare(b.name);
      }

      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else if (sortBy === "date") {
        const aDate = a.item ? new Date(a.item.createdAt).getTime() : 0;
        const bDate = b.item ? new Date(b.item.createdAt).getTime() : 0;
        return bDate - aDate;
      } else if (sortBy === "size") {
        const aSize = a.item?.fileAsset?.sizeBytes || 0;
        const bSize = b.item?.fileAsset?.sizeBytes || 0;
        return bSize - aSize;
      }

      return 0;
    });

    return items;
  }, [currentFolders, currentFiles, sortBy]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalFiles = allItems.length;
    const totalSize = allItems.reduce(
      (sum, item) => sum + (item.fileAsset?.sizeBytes || 0),
      0,
    );
    const totalImages = allItems.filter(isImageItem).length;
    const pinnedCount = allItems.filter((item) => item.isPinned).length;
    const folderCount = folders.length;

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
      folderCount,
      expiringToday,
      expiringSoon,
    };
  }, [allItems, folders]);

  // Handle folder click
  function handleFolderClick(folderId: string, folderName: string) {
    setCurrentFolder(folderId);
    setBreadcrumbs([...breadcrumbs, { name: folderName, folderId }]);
  }

  // Handle breadcrumb click
  function handleBreadcrumbClick(index: number) {
    if (index === breadcrumbs.length - 1) return;

    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    const target = newBreadcrumbs[newBreadcrumbs.length - 1];
    setBreadcrumbs(newBreadcrumbs);
    setCurrentFolder(target.folderId);
  }

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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-20">
        <div className="p-4 md:p-6 lg:px-8 space-y-5 max-w-7xl mx-auto">
          <PageHeader
            title="Drops"
            description="Securely upload, organize, and manage your workspace files."
          >
            <Button onClick={() => setUploadModalOpen(true)} className="rounded-xl shadow-sm hover:shadow-md transition-all group">
              <Upload className="size-4 mr-2 transition-transform group-hover:-translate-y-0.5" />
              Upload Files
            </Button>
          </PageHeader>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end justify-between">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-sm overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center shrink-0">
                  {index > 0 && (
                    <ChevronRight className="size-4 text-muted-foreground/50 mx-1" />
                  )}
                  <button
                    onClick={() => handleBreadcrumbClick(index)}
                    className={cn(
                      "transition-all duration-200 px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800",
                      index === breadcrumbs.length - 1
                        ? "text-foreground font-semibold bg-zinc-100/50 dark:bg-zinc-800/50"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {crumb.name}
                  </button>
                </div>
              ))}
            </nav>

            {/* Search and filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-center shrink-0 w-full sm:w-auto">
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
                label="Folders"
                value={stats.folderCount}
                subtext={currentFolder ? "1 open" : "All visible"}
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
              icon={currentFolder ? Folder : ImageDown}
              title={currentFolder ? "Empty folder" : "Drop your first file"}
              description={
                currentFolder
                  ? "This folder is empty. Upload files to get started."
                  : "Upload images, documents, or any files. Temporary drops expire in 7 days, or pin them to keep forever."
              }
              actionLabel="Upload a file"
              onAction={() => setUploadModalOpen(true)}
            />
          )}

          {/* Grid View */}
          {!isLoading && driveItems.length > 0 && viewMode === "grid" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 animate-in fade-in duration-500">
              {driveItems.map((driveItem) => {
                if (driveItem.type === "folder") {
                  const folder = driveItem.folder!;
                  return (
                    <button
                      key={driveItem.id}
                      onClick={() => handleFolderClick(folder.id, folder.name)}
                      className="group flex flex-col text-left outline-none rounded-2xl focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      <div className="aspect-square w-full rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-center transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-lg group-hover:-translate-y-1 group-active:scale-95 shadow-sm relative overflow-hidden">
                        <Folder className="size-14 text-muted-foreground/50 transition-all duration-300 group-hover:scale-110 group-hover:text-primary relative z-10 drop-shadow-sm" />
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-primary/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      <div className="mt-3 px-1">
                        <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors tracking-tight">
                          {folder.name}
                        </p>
                        <p className="text-[13px] text-muted-foreground mt-0.5">
                          {folder.itemCount} item{folder.itemCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </button>
                  );
                }

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
                      <DropCard item={item} />
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
                  if (driveItem.type === "folder") {
                    const folder = driveItem.folder!;
                    return (
                      <button
                        key={driveItem.id}
                        onClick={() =>
                          handleFolderClick(folder.id, folder.name)
                        }
                        className="w-full grid grid-cols-12 gap-4 px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left group"
                      >
                        <div className="col-span-6 md:col-span-7 flex items-center gap-4">
                          <div className="size-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 group-hover:bg-primary/10 group-hover:text-primary">
                            <Folder className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
                          </div>
                          <span className="truncate font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
                            {folder.name}
                          </span>
                        </div>
                        <div className="col-span-3 md:col-span-2 flex items-center text-sm font-medium text-muted-foreground">
                          {new Date(folder.createdAt).toLocaleDateString()}
                        </div>
                        <div className="col-span-2 flex items-center text-sm font-medium text-muted-foreground">
                          {folder.itemCount} items
                        </div>
                        <div className="col-span-1 flex items-center justify-end">
                          <ChevronRight className="size-5 text-muted-foreground/50 transition-transform group-hover:text-primary group-hover:translate-x-1" />
                        </div>
                      </button>
                    );
                  }

                  const item = driveItem.item!;
                  const FileIcon = getFileIcon(item.fileAsset?.mimeType || "");
                  const iconColor = getFileColor(
                    item.fileAsset?.mimeType || "",
                  );
                  const fileSize = item.fileAsset?.sizeBytes || 0;

                  return (
                    <Link
                      key={driveItem.id}
                      href={`/drops/${item.id}`}
                      className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left group"
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
                    </Link>
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
    </div>
  );
}

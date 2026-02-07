"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ImageDown,
  Upload,
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
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl",
            bgColor,
          )}
        >
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
    { name: "My Files", folderId: null },
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
      <div className="border-b bg-background">
        <div className="p-4 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Files className="w-6 h-6" />
                My Drive
              </h1>
            </div>
          </div>

          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center">
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />
                )}
                <button
                  onClick={() => handleBreadcrumbClick(index)}
                  className={cn(
                    "hover:text-foreground transition-colors",
                    index === breadcrumbs.length - 1
                      ? "text-foreground font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </nav>

          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search in Drive..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
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
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 space-y-6">
          {/* Statistics Cards */}
          {!isLoading && allItems.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                label="Folders"
                value={stats.folderCount}
                subtext={currentFolder ? "1 open" : "All visible"}
                color="text-purple-500"
                bgColor="bg-purple-500/10"
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
                color="text-orange-500"
                bgColor="bg-orange-500/10"
              />
              <StatCard
                icon={AlertTriangle}
                label="Storage Used"
                value={formatBytes(stats.totalSize)}
                subtext={`${stats.pinnedCount} pinned`}
                color="text-green-500"
                bgColor="bg-green-500/10"
              />
            </div>
          )}

          {/* Expiring Alert */}
          {!isLoading && stats.expiringToday > 0 && (
            <div className="relative overflow-hidden rounded-xl border border-orange-500/50 bg-orange-500/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500/20">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                    {stats.expiringToday} file
                    {stats.expiringToday > 1 ? "s" : ""} expiring today!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    These files will be automatically deleted. Pin them to keep
                    permanently.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Toolbar */}
          {driveItems.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                {selectionMode && (
                  <Button size="sm" variant="ghost" onClick={selectAll}>
                    Select All ({currentFiles.length})
                  </Button>
                )}
                <p className="text-sm text-muted-foreground">
                  {selectedIds.size > 0
                    ? `${selectedIds.size} selected`
                    : `${driveItems.length} item${driveItems.length !== 1 ? "s" : ""}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center border rounded-lg">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "p-2 transition-colors",
                      viewMode === "grid"
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50",
                    )}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "p-2 transition-colors",
                      viewMode === "list"
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50",
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="text-sm border rounded-lg px-2 py-2 bg-background"
                >
                  <option value="date">Date</option>
                  <option value="name">Name</option>
                  <option value="size">Size</option>
                </select>
                <Button
                  variant={selectionMode ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (selectionMode) {
                      clearSelection();
                    } else {
                      setSelectionMode(true);
                    }
                  }}
                >
                  <CheckSquare className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1">
                    {selectionMode ? "Cancel" : "Select"}
                  </span>
                </Button>
                <Button onClick={() => setUploadModalOpen(true)} size="sm">
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1">Upload</span>
                </Button>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="space-y-4">
              {viewMode === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="aspect-square w-full rounded-lg" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {driveItems.map((driveItem) => {
                if (driveItem.type === "folder") {
                  const folder = driveItem.folder!;
                  return (
                    <button
                      key={driveItem.id}
                      onClick={() => handleFolderClick(folder.id, folder.name)}
                      className="group text-left"
                    >
                      <div className="aspect-square rounded-xl bg-muted/50 border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-all">
                        <Folder className="w-16 h-16 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <p className="text-sm font-medium mt-2 truncate">
                        {folder.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {folder.itemCount} item
                        {folder.itemCount !== 1 ? "s" : ""}
                      </p>
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
                          "absolute top-2 right-2 z-10 cursor-pointer transition-opacity",
                          isSelected
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100",
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelection(item.id);
                        }}
                      >
                        <div
                          className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "bg-background/80 border-muted-foreground/50 hover:border-primary",
                          )}
                        >
                          {isSelected && (
                            <Square className="w-3 h-3 fill-current" />
                          )}
                        </div>
                      </div>
                    )}
                    <div
                      className={cn(
                        "transition-all",
                        selectionMode &&
                          isSelected &&
                          "ring-2 ring-primary rounded-xl",
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
            <div className="border rounded-xl overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-muted/50 text-sm font-medium text-muted-foreground border-b">
                <div className="col-span-6">Name</div>
                <div className="col-span-3">Modified</div>
                <div className="col-span-2">Size</div>
                <div className="col-span-1"></div>
              </div>

              {/* Rows */}
              <div className="divide-y">
                {driveItems.map((driveItem) => {
                  if (driveItem.type === "folder") {
                    const folder = driveItem.folder!;
                    return (
                      <button
                        key={driveItem.id}
                        onClick={() =>
                          handleFolderClick(folder.id, folder.name)
                        }
                        className="w-full grid grid-cols-12 gap-4 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="col-span-6 flex items-center gap-3">
                          <Folder className="w-8 h-8 text-muted-foreground shrink-0" />
                          <span className="truncate font-medium">
                            {folder.name}
                          </span>
                        </div>
                        <div className="col-span-3 flex items-center text-sm text-muted-foreground">
                          {new Date(folder.createdAt).toLocaleDateString()}
                        </div>
                        <div className="col-span-2 flex items-center text-sm text-muted-foreground">
                          {folder.itemCount} items
                        </div>
                        <div className="col-span-1 flex items-center justify-end">
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
                      className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="col-span-6 flex items-center gap-3">
                        <div className="w-8 h-8 rounded flex items-center justify-center bg-muted">
                          <FileIcon className={cn("w-5 h-5", iconColor)} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{item.title}</p>
                        </div>
                      </div>
                      <div className="col-span-3 flex items-center text-sm text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                      <div className="col-span-2 flex items-center text-sm text-muted-foreground">
                        {formatBytes(fileSize)}
                      </div>
                      <div className="col-span-1 flex items-center justify-end">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
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

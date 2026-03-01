"use client";

import { useState, useMemo, useCallback } from "react";
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import {
  Link as LinkIcon,
  StickyNote,
  Search,
  SortAsc,
  CheckSquare,
  Tag,
  X,
  Folder,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState } from "@/components/shared/empty-state";
import { CollectionsSidebar } from "@/components/drops/collections-sidebar";
import { AddLinkForm } from "@/components/pinboard/add-link-form";
import { AddNoteForm } from "@/components/pinboard/add-note-form";
import { LinkCard } from "@/components/pinboard/link-card";
import { NoteCard } from "@/components/pinboard/note-card";
import { PinboardBatchActionBar } from "@/components/pinboard/pinboard-batch-action-bar";
import { useItems } from "@/hooks/use-items";
import { useMoveItemToCollection } from "@/hooks/use-collections";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/patterns";
import { toast } from "sonner";

type ActiveTab = "links" | "notes";
type SortBy = "date" | "name";

export default function PinboardPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("links");
  const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);

  // Collection sidebar filter
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  // Mobile collections sheet
  const [showCollectionsSheet, setShowCollectionsSheet] = useState(false);

  // Search + sort
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("date");

  // Tag filter (multi-select, client-side)
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: linksData, isLoading: linksLoading } = useItems({ type: "link" });
  const { data: notesData, isLoading: notesLoading } = useItems({ type: "note" });

  const allLinks = linksData?.data ?? [];
  const allNotes = notesData?.data ?? [];

  const moveItem = useMoveItemToCollection();

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  // Handle drag end: item dropped on a collection drop zone
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeStr = String(active.id);
      const overStr = String(over.id);

      if (!activeStr.startsWith("item:") || !overStr.startsWith("collection:")) return;

      const itemId = activeStr.replace("item:", "");
      const collectionIdRaw = overStr.replace("collection:", "");
      const collectionId = collectionIdRaw === "null" ? null : collectionIdRaw;

      const item = [...allLinks, ...allNotes].find((i) => i.id === itemId);
      if (!item) return;
      if (item.collectionId === collectionId) return;

      moveItem.mutate(
        { itemId, collectionId },
        {
          onSuccess: () => toast.success("Moved to collection"),
          onError: () => toast.error("Failed to move item"),
        },
      );
    },
    [allLinks, allNotes, moveItem],
  );

  // Derive unique tags from all items
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    [...allLinks, ...allNotes].forEach((item) => {
      item.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [allLinks, allNotes]);

  // Apply collection → search → tags → sort filters
  function applyFilters(items: typeof allLinks) {
    let result = [...items];

    // Collection filter
    if (selectedCollectionId !== null) {
      result = result.filter((item) => item.collectionId === selectedCollectionId);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          item.content?.toLowerCase().includes(q),
      );
    }

    // Tag filter (item must have ALL selected tags)
    if (selectedTags.length > 0) {
      result = result.filter((item) =>
        selectedTags.every((tag) => item.tags?.includes(tag)),
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "name") return (a.title || "").localeCompare(b.title || "");
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }

  const filteredLinks = useMemo(
    () => applyFilters(allLinks),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allLinks, selectedCollectionId, searchQuery, selectedTags, sortBy],
  );

  const filteredNotes = useMemo(
    () => applyFilters(allNotes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allNotes, selectedCollectionId, searchQuery, selectedTags, sortBy],
  );

  // Selection helpers
  function toggleSelection(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  const currentItems = activeTab === "links" ? filteredLinks : filteredNotes;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-full overflow-hidden">
        {/* Collections sidebar — reused as-is from Drops */}
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
          {/* Sticky header */}
          <div className="border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-20">
            <div className="p-4 md:p-6 lg:px-8 space-y-4 max-w-7xl mx-auto w-full">
              <PageHeader
                title="Pinboard"
                description="Save important links and quick notes permanently."
              >
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setIsAddLinkModalOpen(true)}
                    variant="outline"
                    className="rounded-xl shadow-sm hover:shadow-md transition-all group border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 px-3 sm:px-4"
                  >
                    <LinkIcon className="size-4 sm:mr-2 transition-transform group-hover:rotate-12" />
                    <span className="hidden sm:inline">Add Link</span>
                  </Button>
                  <Button
                    onClick={() => setIsAddNoteModalOpen(true)}
                    className="rounded-xl shadow-sm hover:shadow-md transition-all group px-3 sm:px-4"
                  >
                    <StickyNote className="size-4 sm:mr-2 transition-transform group-hover:scale-110" />
                    <span className="hidden sm:inline">Add Note</span>
                  </Button>
                </div>
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

              {/* Search + sort + select row */}
              <div className="flex flex-col sm:flex-row gap-3 items-center w-full">
                <div className="relative w-full sm:w-64 group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200/50 dark:border-zinc-800/50 focus-visible:ring-primary/20 transition-all w-full"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap ml-auto">
                  {/* Sort */}
                  <div className="relative flex items-center border border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-900 rounded-xl shadow-sm overflow-hidden group hover:border-primary/30 transition-colors">
                    <SortAsc className="absolute left-3 size-4 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortBy)}
                      className="text-sm font-medium border-0 px-3 py-2.5 pl-9 bg-transparent focus:ring-0 outline-none appearance-none cursor-pointer w-28 text-foreground"
                    >
                      <option value="date" className="bg-background">Newest</option>
                      <option value="name" className="bg-background">Name</option>
                    </select>
                  </div>

                  {/* Select toggle */}
                  {currentItems.length > 0 && (
                    <Button
                      variant={selectionMode ? "default" : "outline"}
                      className={cn(
                        "rounded-xl shadow-sm transition-all duration-300",
                        selectionMode
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-white dark:bg-zinc-900 border-zinc-200/50 dark:border-zinc-800/50",
                      )}
                      onClick={() => {
                        if (selectionMode) clearSelection();
                        else setSelectionMode(true);
                      }}
                    >
                      <CheckSquare className={cn("size-4 transition-transform", selectionMode && "scale-110")} />
                      <span className="ml-2 font-semibold">{selectionMode ? "Done" : "Select"}</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <Tabs
                value={activeTab}
                onValueChange={(v) => {
                  setActiveTab(v as ActiveTab);
                  clearSelection();
                }}
                className="w-full sm:w-auto"
              >
                <TabsList className="h-10 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl w-full grid grid-cols-2 sm:flex sm:w-fit">
                  <TabsTrigger
                    value="links"
                    className="rounded-lg text-sm font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm gap-2 px-6"
                  >
                    <LinkIcon className="size-4" />
                    Links
                    {allLinks.length > 0 && (
                      <span className="text-[11px] text-muted-foreground bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded-md">
                        {allLinks.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="notes"
                    className="rounded-lg text-sm font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm gap-2 px-6"
                  >
                    <StickyNote className="size-4" />
                    Notes
                    {allNotes.length > 0 && (
                      <span className="text-[11px] text-muted-foreground bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded-md">
                        {allNotes.length}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-auto bg-zinc-50/50 dark:bg-zinc-950/50 scroll-smooth">
            <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full animate-in fade-in duration-500">

              {/* Stats summary bar */}
              {(allLinks.length > 0 || allNotes.length > 0) && (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-full px-3 py-1.5 shadow-sm">
                    <LinkIcon className="size-3 text-blue-500" />
                    <span className="text-foreground font-semibold">{allLinks.length}</span>
                    <span>link{allLinks.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-full px-3 py-1.5 shadow-sm">
                    <StickyNote className="size-3 text-amber-500" />
                    <span className="text-foreground font-semibold">{allNotes.length}</span>
                    <span>note{allNotes.length !== 1 ? "s" : ""}</span>
                  </div>
                  {allTags.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-full px-3 py-1.5 shadow-sm">
                      <Tag className="size-3 text-violet-500" />
                      <span className="text-foreground font-semibold">{allTags.length}</span>
                      <span>tag{allTags.length !== 1 ? "s" : ""}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Tag filter bar */}
              {allTags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="size-3.5 text-muted-foreground shrink-0" />
                  {allTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "secondary"}
                      className={cn(
                        "cursor-pointer select-none text-xs px-2.5 py-1 rounded-full transition-all",
                        selectedTags.includes(tag)
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "hover:bg-muted",
                      )}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                  {selectedTags.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setSelectedTags([])}
                    >
                      <X className="size-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              )}

              <Tabs
                value={activeTab}
                onValueChange={(v) => {
                  setActiveTab(v as ActiveTab);
                  clearSelection();
                }}
                className="w-full"
              >
                {/* Hidden tab list — visual one is in the header */}
                <TabsList className="hidden">
                  <TabsTrigger value="links">Links</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>

                {/* ── Links Tab ── */}
                <TabsContent
                  value="links"
                  className="space-y-4 outline-none pt-2 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:duration-500"
                >
                  {/* Quick-add strip */}
                  <div
                    onClick={() => setIsAddLinkModalOpen(true)}
                    className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 p-2 cursor-text hover:border-primary/30 hover:shadow-md transition-all duration-300 flex items-center gap-3 text-muted-foreground group"
                  >
                    <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-xl group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <LinkIcon className="size-4" />
                    </div>
                    <span className="text-sm font-medium">Paste a URL to save a new link...</span>
                  </div>

                  {/* Select all strip */}
                  {selectionMode && filteredLinks.length > 0 && (
                    <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-xl px-4 py-2 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedIds(new Set(filteredLinks.map((i) => i.id)))}
                        className="h-7 text-xs font-semibold"
                      >
                        Select All ({filteredLinks.length})
                      </Button>
                      {selectedIds.size > 0 && (
                        <span className="text-sm text-primary font-medium">{selectedIds.size} selected</span>
                      )}
                    </div>
                  )}

                  {/* Loading */}
                  {linksLoading && (
                    <div className="space-y-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                      ))}
                    </div>
                  )}

                  {/* Empty */}
                  {!linksLoading && filteredLinks.length === 0 && (
                    <EmptyState
                      icon={LinkIcon}
                      title={allLinks.length === 0 ? "No links saved" : "No links match your filters"}
                      description={
                        allLinks.length === 0
                          ? "Click 'Add Link' above or paste a URL to save your first link."
                          : "Try adjusting your search, tag filters, or collection."
                      }
                    />
                  )}

                  {/* Link list */}
                  {!linksLoading && filteredLinks.length > 0 && (
                    <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
                      {filteredLinks.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            "transition-all duration-300 rounded-2xl",
                            !selectionMode && "hover:-translate-x-1 hover:shadow-md",
                          )}
                        >
                          <LinkCard
                            item={item}
                            selectionMode={selectionMode}
                            isSelected={selectedIds.has(item.id)}
                            onSelect={toggleSelection}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* ── Notes Tab ── */}
                <TabsContent
                  value="notes"
                  className="space-y-4 outline-none pt-2 data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:duration-500"
                >
                  {/* Add note button */}
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground h-14 rounded-2xl border-dashed border-2 border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all duration-300 group shadow-sm px-6"
                    onClick={() => setIsAddNoteModalOpen(true)}
                  >
                    <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <StickyNote className="size-4" />
                    </div>
                    <span className="font-medium">Write a new note...</span>
                  </Button>

                  {/* Select all strip */}
                  {selectionMode && filteredNotes.length > 0 && (
                    <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-xl px-4 py-2 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedIds(new Set(filteredNotes.map((i) => i.id)))}
                        className="h-7 text-xs font-semibold"
                      >
                        Select All ({filteredNotes.length})
                      </Button>
                      {selectedIds.size > 0 && (
                        <span className="text-sm text-primary font-medium">{selectedIds.size} selected</span>
                      )}
                    </div>
                  )}

                  {/* Loading */}
                  {notesLoading && (
                    <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="break-inside-avoid mb-4">
                          <Skeleton className="h-40 w-full rounded-2xl" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty */}
                  {!notesLoading && filteredNotes.length === 0 && (
                    <EmptyState
                      icon={StickyNote}
                      title={allNotes.length === 0 ? "No notes yet" : "No notes match your filters"}
                      description={
                        allNotes.length === 0
                          ? "Click 'Add Note' to create your first note."
                          : "Try adjusting your search, tag filters, or collection."
                      }
                    />
                  )}

                  {/* Masonry note grid */}
                  {!notesLoading && filteredNotes.length > 0 && (
                    <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 animate-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
                      {filteredNotes.map((item) => (
                        <div key={item.id} className="break-inside-avoid mb-4">
                          <NoteCard
                            item={item}
                            selectionMode={selectionMode}
                            isSelected={selectedIds.has(item.id)}
                            onSelect={toggleSelection}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Batch action bar */}
          <PinboardBatchActionBar
            selectedIds={Array.from(selectedIds)}
            onClear={clearSelection}
          />
        </div>
      </div>

      {/* Add Link Modal */}
      <Dialog open={isAddLinkModalOpen} onOpenChange={setIsAddLinkModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Link</DialogTitle>
            <DialogDescription>
              Save a URL with optional title, note, and tags.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <AddLinkForm
              onSuccess={() => setIsAddLinkModalOpen(false)}
              onCancel={() => setIsAddLinkModalOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Note Modal */}
      <Dialog open={isAddNoteModalOpen} onOpenChange={setIsAddNoteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Write a Note</DialogTitle>
            <DialogDescription>
              Create a quick note. You can optionally password-protect it.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <AddNoteForm
              onSuccess={() => setIsAddNoteModalOpen(false)}
              onCancel={() => setIsAddNoteModalOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

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

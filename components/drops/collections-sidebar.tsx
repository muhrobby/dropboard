"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  Folder,
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Inbox,
  Globe,
  GlobeLock,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  useCollections,
  useCreateCollection,
  useUpdateCollection,
  useDeleteCollection,
  usePublishCollection,
  useUnpublishCollection,
} from "@/hooks/use-collections";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { CollectionResponse } from "@/types/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type CollectionsSidebarProps = {
  selectedCollectionId: string | null;
  onSelectCollection: (id: string | null) => void;
  className?: string;
};

// Droppable zone for a single collection node
function DroppableCollection({
  collection,
  isSelected,
  isOver,
  droppableRef,
  children,
  onClick,
}: {
  collection: CollectionResponse;
  isSelected: boolean;
  isOver: boolean;
  droppableRef: (node: HTMLElement | null) => void;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <div
      ref={droppableRef}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm cursor-pointer transition-all duration-150 select-none group",
        isSelected
          ? "bg-primary/10 text-primary font-semibold"
          : "text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-foreground",
        isOver && "ring-2 ring-primary ring-inset bg-primary/5",
      )}
    >
      {children}
    </div>
  );
}

// Droppable "All Files" node (collectionId = null)
function DroppableAllFiles({
  isSelected,
  onClick,
}: {
  isSelected: boolean;
  onClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "collection:null" });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm cursor-pointer transition-all duration-150 select-none",
        isSelected
          ? "bg-primary/10 text-primary font-semibold"
          : "text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-foreground",
        isOver && "ring-2 ring-primary ring-inset bg-primary/5",
      )}
    >
      <Inbox className="size-4 shrink-0" />
      <span className="truncate flex-1">All Files</span>
    </div>
  );
}

function CollectionNode({
  collection,
  allCollections,
  selectedCollectionId,
  onSelectCollection,
  depth,
}: {
  collection: CollectionResponse;
  allCollections: CollectionResponse[];
  selectedCollectionId: string | null;
  onSelectCollection: (id: string | null) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(collection.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const updateCollection = useUpdateCollection();
  const deleteCollection = useDeleteCollection();
  const publishCollection = usePublishCollection();
  const unpublishCollection = useUnpublishCollection();

  const children = allCollections.filter((c) => c.parentId === collection.id);
  const hasChildren = children.length > 0;
  const isSelected = selectedCollectionId === collection.id;

  const { setNodeRef, isOver } = useDroppable({
    id: `collection:${collection.id}`,
  });

  function handleRename() {
    if (!renameValue.trim() || renameValue.trim() === collection.name) {
      setRenaming(false);
      setRenameValue(collection.name);
      return;
    }
    updateCollection.mutate(
      { id: collection.id, name: renameValue.trim() },
      {
        onSuccess: () => {
          toast.success("Collection renamed");
          setRenaming(false);
        },
        onError: () => {
          toast.error("Failed to rename collection");
          setRenaming(false);
          setRenameValue(collection.name);
        },
      },
    );
  }

  function handleDelete() {
    deleteCollection.mutate(collection.id, {
      onSuccess: () => {
        toast.success("Collection deleted");
        setConfirmDelete(false);
        // If the deleted collection was selected, go back to All Files
        if (selectedCollectionId === collection.id) {
          onSelectCollection(null);
        }
      },
      onError: () => toast.error("Failed to delete collection"),
    });
  }

  function handlePublish() {
    publishCollection.mutate(collection.id, {
      onSuccess: (updated) => {
        toast.success("Board published");
        if (updated.boardUrl) {
          navigator.clipboard.writeText(updated.boardUrl).catch(() => {});
          toast.success("Board URL copied to clipboard");
        }
      },
      onError: () => toast.error("Failed to publish board"),
    });
  }

  function handleUnpublish() {
    unpublishCollection.mutate(collection.id, {
      onSuccess: () => toast.success("Board unpublished"),
      onError: () => toast.error("Failed to unpublish board"),
    });
  }

  function handleCopyBoardUrl() {
    if (!collection.boardUrl) return;
    navigator.clipboard.writeText(collection.boardUrl).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 1500);
      toast.success("Board URL copied");
    });
  }

  return (
    <>
      <div style={{ paddingLeft: depth * 12 }}>
        <DroppableCollection
          collection={collection}
          isSelected={isSelected}
          isOver={isOver}
          droppableRef={setNodeRef}
          onClick={() => {
            if (!renaming) {
              onSelectCollection(collection.id);
              if (hasChildren) setExpanded((e) => !e);
            }
          }}
        >
          {/* Expand chevron */}
          <button
            className="shrink-0 size-4 flex items-center justify-center text-muted-foreground/60 hover:text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
          >
            {hasChildren ? (
              expanded ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )
            ) : null}
          </button>

          {/* Folder icon */}
          {isSelected || expanded ? (
            <FolderOpen className="size-4 shrink-0 text-primary" />
          ) : (
            <Folder className="size-4 shrink-0" />
          )}

          {/* Name / rename input */}
          {renaming ? (
            <Input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") {
                  setRenaming(false);
                  setRenameValue(collection.name);
                }
              }}
              className="h-6 text-xs px-1.5 flex-1 min-w-0"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate flex-1 text-left">{collection.name}</span>
          )}

          {/* Actions dropdown */}
          {!renaming && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenameValue(collection.name);
                    setRenaming(true);
                  }}
                >
                  <Pencil className="mr-2 size-3.5" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {collection.isPublic ? (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyBoardUrl();
                      }}
                    >
                      {copiedUrl ? (
                        <Check className="mr-2 size-3.5 text-green-500" />
                      ) : (
                        <Copy className="mr-2 size-3.5" />
                      )}
                      Copy Board URL
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnpublish();
                      }}
                    >
                      <GlobeLock className="mr-2 size-3.5" />
                      Unpublish Board
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePublish();
                    }}
                  >
                    <Globe className="mr-2 size-3.5" />
                    Publish as Board
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(true);
                  }}
                >
                  <Trash2 className="mr-2 size-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </DroppableCollection>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {children.map((child) => (
            <CollectionNode
              key={child.id}
              collection={child}
              allCollections={allCollections}
              selectedCollectionId={selectedCollectionId}
              onSelectCollection={onSelectCollection}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete "${collection.name}"?`}
        description="Items in this collection will be moved to All Files. Subcollections will be moved up. This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={deleteCollection.isPending}
      />
    </>
  );
}

export function CollectionsSidebar({
  selectedCollectionId,
  onSelectCollection,
  className,
}: CollectionsSidebarProps) {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { data: collections = [], isLoading } = useCollections();
  const createCollection = useCreateCollection();

  const [creatingName, setCreatingName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  // Top-level collections (no parent)
  const rootCollections = collections.filter((c) => c.parentId === null);

  function handleCreate() {
    if (!creatingName.trim()) {
      setShowCreate(false);
      return;
    }
    createCollection.mutate(
      { name: creatingName.trim() },
      {
        onSuccess: () => {
          toast.success("Collection created");
          setCreatingName("");
          setShowCreate(false);
        },
        onError: () => toast.error("Failed to create collection"),
      },
    );
  }

  if (!activeWorkspaceId) return null;

  return (
    <aside
      className={cn(
        "flex flex-col gap-1 w-56 shrink-0 py-2 px-1",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 mb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Collections
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-5 text-muted-foreground hover:text-foreground"
          onClick={() => setShowCreate(true)}
          title="New collection"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      {/* All Files node */}
      <DroppableAllFiles
        isSelected={selectedCollectionId === null}
        onClick={() => onSelectCollection(null)}
      />

      {/* Collection tree */}
      {isLoading ? (
        <div className="px-2 py-4 text-xs text-muted-foreground">Loading...</div>
      ) : (
        rootCollections.map((col) => (
          <CollectionNode
            key={col.id}
            collection={col}
            allCollections={collections}
            selectedCollectionId={selectedCollectionId}
            onSelectCollection={onSelectCollection}
            depth={0}
          />
        ))
      )}

      {/* Inline create */}
      {showCreate && (
        <div className="px-2 mt-1">
          <Input
            autoFocus
            placeholder="Collection name"
            value={creatingName}
            onChange={(e) => setCreatingName(e.target.value)}
            onBlur={handleCreate}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setShowCreate(false);
                setCreatingName("");
              }
            }}
            className="h-7 text-xs"
          />
        </div>
      )}
    </aside>
  );
}

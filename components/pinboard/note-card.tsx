"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { MoreVertical, Trash2, StickyNote, Copy, ShieldAlert, CheckSquare, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PinboardDetailSheet } from "./pinboard-detail-sheet";
import { NoteDetailModal } from "./note-detail-modal";
import { useDeleteItem } from "@/hooks/use-items";
import type { ItemResponse } from "@/types/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type NoteCardProps = {
  item: ItemResponse;
  /** Selection mode: show checkbox overlay */
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function NoteCard({
  item,
  selectionMode = false,
  isSelected = false,
  onSelect,
}: NoteCardProps) {
  const [showDelete, setShowDelete] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const deleteItem = useDeleteItem();

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `item:${item.id}`,
      data: { itemId: item.id },
      disabled: selectionMode,
    });

  const dragStyle = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  function handleDelete() {
    deleteItem.mutate(item.id, {
      onSuccess: () => {
        toast.success("Note deleted");
        setShowDelete(false);
      },
      onError: () => toast.error("Failed to delete"),
    });
  }

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    if (item.content) {
      const plainText = item.content.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      navigator.clipboard.writeText(plainText);
      toast.success("Note copied to clipboard");
    }
  }

  function handleCardClick() {
    if (selectionMode) {
      onSelect?.(item.id);
    } else {
      setShowDetail(true);
    }
  }

  // Handle protected note rendering logic in Phase 2
  const isProtected = item.isProtected || false;

  return (
    <>
      <div
        ref={setNodeRef}
        style={dragStyle}
        className={cn("relative", isDragging && "z-50")}
        {...(selectionMode ? {} : listeners)}
        {...(selectionMode ? {} : attributes)}
      >
        {/* Selection checkbox overlay */}
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
              onSelect?.(item.id);
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
              <CheckSquare
                className={cn(
                  "size-3.5 transition-opacity",
                  isSelected ? "opacity-100" : "opacity-0",
                )}
              />
            </div>
          </div>
        )}

        <Card
          className={cn(
            "group flex flex-col p-4 space-y-3 cursor-pointer transition-all hover:bg-muted/50 hover:shadow-sm hover:border-border/80",
            isDragging && "opacity-50 ring-2 ring-primary",
            selectionMode && isSelected && "ring-2 ring-primary ring-offset-2",
          )}
          onClick={handleCardClick}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-amber-500/10 text-amber-600 rounded-md shrink-0">
                {isProtected ? <ShieldAlert className="h-4 w-4" /> : <StickyNote className="h-4 w-4" />}
              </div>
              <p className="text-sm font-semibold truncate leading-none mt-0.5">{item.title}</p>
            </div>
            {/* Actions — hidden in selection mode */}
            {!selectionMode && (
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleCopy}
                  title="Copy Note"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowEdit(true);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Note
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowDelete(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Note
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Content preview */}
          <div className="flex-1 min-h-0">
            {isProtected ? (
               <div className="h-full flex items-center justify-center bg-muted/30 rounded-md border border-dashed py-4">
                   <p className="text-xs text-muted-foreground italic">Protected Note</p>
               </div>
            ) : item.content ? (
              <div
                className="text-sm text-muted-foreground line-clamp-3 leading-relaxed
                  [&_p]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4
                  [&_strong]:font-semibold [&_em]:italic [&_code]:bg-muted [&_code]:rounded
                  [&_code]:px-1 [&_code]:text-[0.85em] [&_code]:font-mono [&_h1]:font-bold
                  [&_h2]:font-semibold [&_h3]:font-semibold [&_blockquote]:border-l-2
                  [&_blockquote]:pl-2 [&_blockquote]:border-muted-foreground/30"
                dangerouslySetInnerHTML={{ __html: item.content }}
              />
            ) : (
              <p className="text-sm text-muted-foreground italic">No content</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 mt-auto">
            {item.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal bg-muted/60">
                    {tag}
                  </Badge>
                ))}
                {item.tags.length > 3 && (
                  <span className="text-[10px] text-muted-foreground ml-1">+{item.tags.length - 3}</span>
                )}
              </div>
            ) : (
              <span className="text-[11px] text-muted-foreground/60 italic">No tags</span>
            )}
            <span className="text-[11px] text-muted-foreground font-mono bg-muted/40 px-1.5 py-0.5 rounded">
              {formatDate(item.createdAt)}
            </span>
          </div>
        </Card>
      </div>

      {!selectionMode && (
        <>
          <PinboardDetailSheet
            item={item}
            open={showDetail}
            onOpenChange={setShowDetail}
          />

          <NoteDetailModal
            item={item}
            open={showEdit}
            onOpenChange={setShowEdit}
          />

          <ConfirmDialog
            open={showDelete}
            onOpenChange={setShowDelete}
            title="Delete note"
            description={`Are you sure you want to delete "${item.title}"? This cannot be undone.`}
            confirmLabel="Delete permanently"
            variant="destructive"
            onConfirm={handleDelete}
            isPending={deleteItem.isPending}
          />
        </>
      )}
    </>
  );
}

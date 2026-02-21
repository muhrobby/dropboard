"use client";

import { useState } from "react";
import { MoreVertical, Trash2, StickyNote, Copy, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { NoteDetailModal } from "./note-detail-modal";
import { useDeleteItem } from "@/hooks/use-items";
import type { ItemResponse } from "@/types/api";
import { toast } from "sonner";

type NoteCardProps = {
  item: ItemResponse;
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function NoteCard({ item }: NoteCardProps) {
  const [showDelete, setShowDelete] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const deleteItem = useDeleteItem();

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
      navigator.clipboard.writeText(item.content);
      toast.success("Note copied to clipboard");
    }
  }

  // Handle protected note rendering logic in Phase 2
  const isProtected = item.isProtected || false;

  return (
    <>
      <Card
        className="group flex flex-col p-4 space-y-3 cursor-pointer transition-all hover:bg-muted/50 hover:shadow-sm hover:border-border/80"
        onClick={() => setShowDetail(true)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-md shrink-0">
              {isProtected ? <ShieldAlert className="h-4 w-4" /> : <StickyNote className="h-4 w-4" />}
            </div>
            <p className="text-sm font-semibold truncate leading-none mt-0.5">{item.title}</p>
          </div>
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
                  onClick={() => setShowDelete(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Note
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content preview */}
        <div className="flex-1">
          {isProtected ? (
             <div className="h-full flex items-center justify-center bg-muted/30 rounded-md border border-dashed py-4">
                 <p className="text-xs text-muted-foreground italic">Protected Note</p>
             </div>
          ) : (
            <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap leading-relaxed">
              {item.content}
            </p>
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

      <NoteDetailModal
        item={item}
        open={showDetail}
        onOpenChange={setShowDetail}
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
  );
}

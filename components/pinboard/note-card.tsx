"use client";

import { useState } from "react";
import { MoreVertical, Trash2, StickyNote } from "lucide-react";
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

  return (
    <>
      <Card
        className="group p-4 space-y-2 cursor-pointer transition-colors hover:bg-muted/50"
        onClick={() => setShowDetail(true)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <StickyNote className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-sm font-medium truncate">{item.title}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {formatDate(item.createdAt)}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setShowDelete(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content preview */}
        <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">
          {item.content}
        </p>

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
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
        description="This note will be permanently deleted."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={deleteItem.isPending}
      />
    </>
  );
}

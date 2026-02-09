"use client";

import { useState } from "react";
import {
  ExternalLink,
  MoreVertical,
  Trash2,
  Copy,
  Eye,
} from "lucide-react";
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
import { LinkDetailModal } from "./link-detail-modal";
import { useDeleteItem } from "@/hooks/use-items";
import type { ItemResponse } from "@/types/api";
import { toast } from "sonner";

type LinkCardProps = {
  item: ItemResponse;
};

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).origin;
    return `${domain}/favicon.ico`;
  } catch {
    return "";
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function LinkCard({ item }: LinkCardProps) {
  const [showDelete, setShowDelete] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const deleteItem = useDeleteItem();

  const url = item.content || "";
  const domain = getDomain(url);
  const faviconUrl = getFaviconUrl(url);

  function handleOpen() {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleCopy() {
    navigator.clipboard.writeText(url);
    toast.success("URL copied");
  }

  function handleDelete() {
    deleteItem.mutate(item.id, {
      onSuccess: () => {
        toast.success("Link deleted");
        setShowDelete(false);
      },
      onError: () => toast.error("Failed to delete"),
    });
  }

  return (
    <>
      <Card
        className="group cursor-pointer p-4 transition-colors hover:bg-muted/50"
        onClick={() => setShowDetail(true)}
      >
        <div className="flex items-start gap-3">
          {/* Favicon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            {faviconUrl ? (
              <img
                src={faviconUrl}
                alt=""
                className="h-5 w-5"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                }}
              />
            ) : null}
            <ExternalLink className={`h-5 w-5 text-muted-foreground ${faviconUrl ? "hidden" : ""}`} />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-medium truncate">{item.title}</p>
            <p className="text-xs text-muted-foreground truncate">{domain}</p>
            {item.note && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {item.note}
              </p>
            )}
            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {item.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
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
                <DropdownMenuItem onClick={handleOpen}>
                  <ExternalLink className="mr-2 h-3.5 w-3.5" />
                  Open
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopy}>
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Copy URL
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowDetail(true)}>
                  <Eye className="mr-2 h-3.5 w-3.5" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
      </Card>

      <LinkDetailModal
        item={item}
        open={showDetail}
        onOpenChange={setShowDetail}
      />

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete link"
        description="This link will be permanently deleted."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={deleteItem.isPending}
      />
    </>
  );
}

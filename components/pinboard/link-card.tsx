"use client";

import { useState } from "react";
import {
  ExternalLink,
  MoreVertical,
  Trash2,
  Copy,
  Eye,
  Link as LinkIcon
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
import Image from "next/image";

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
    // Utilize Google's reliable favicon service for better fallback and caching
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
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
  const [imgError, setImgError] = useState(false);
  const deleteItem = useDeleteItem();

  const url = item.content || "";
  const domain = getDomain(url);
  const faviconUrl = getFaviconUrl(url);

  function handleOpen(e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleCopy(e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
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
        className="group flex flex-col p-4 cursor-pointer transition-all hover:bg-muted/50 hover:shadow-sm hover:border-border/80 min-h-[140px]"
        onClick={() => setShowDetail(true)}
      >
        <div className="flex items-start gap-3 w-full">
          {/* Favicon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 overflow-hidden">
            {!imgError && faviconUrl ? (
              <img
                src={faviconUrl}
                alt={`${domain} icon`}
                className="h-5 w-5 object-contain"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            ) : (
              <LinkIcon className="h-5 w-5 text-indigo-500/70" />
            )}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1 space-y-1 pr-2">
            <p className="text-sm font-semibold truncate leading-tight mt-0.5" title={item.title}>
              {item.title}
            </p>
            <p className="text-xs text-muted-foreground truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" 
               onClick={handleOpen} title={url}>
              {domain}
            </p>
            
            {item.note && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
                {item.note}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0 -mt-1 -mr-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleCopy}
              title="Copy URL"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex"
              onClick={handleOpen}
              title="Open Link"
            >
              <ExternalLink className="h-3.5 w-3.5" />
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
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={handleOpen}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopy}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy URL
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDelete(true)}
                  className="text-destructive focus:bg-destructive/10"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 mt-auto w-full">
          {item.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 overflow-hidden">
              {item.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal bg-muted/60">
                  {tag}
                </Badge>
              ))}
              {item.tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground ml-1 shrink-0">+{item.tags.length - 3}</span>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground/60 italic">No tags</span>
          )}
          <span className="text-[11px] text-muted-foreground font-mono bg-muted/40 px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap ml-2">
            {formatDate(item.createdAt)}
          </span>
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
        description={`Are you sure you want to delete "${item.title}"? This cannot be undone.`}
        confirmLabel="Delete permanently"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={deleteItem.isPending}
      />
    </>
  );
}

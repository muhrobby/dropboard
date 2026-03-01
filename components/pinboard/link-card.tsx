"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  ExternalLink,
  MoreVertical,
  Trash2,
  Copy,
  BookOpen,
  Link as LinkIcon,
  CheckSquare,
  Pencil,
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
import { PinboardDetailSheet } from "./pinboard-detail-sheet";
import { ReaderViewSheet } from "./reader-view-sheet";
import { LinkDetailModal } from "./link-detail-modal";
import { useDeleteItem } from "@/hooks/use-items";
import type { ItemResponse } from "@/types/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type LinkCardProps = {
  item: ItemResponse;
  /** Selection mode: show checkbox overlay */
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
};

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function LinkCard({
  item,
  selectionMode = false,
  isSelected = false,
  onSelect,
}: LinkCardProps) {
  const [showDelete, setShowDelete] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showReader, setShowReader] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [ogImgError, setOgImgError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const deleteItem = useDeleteItem();

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `item:${item.id}`,
      data: { itemId: item.id },
      // Disable dragging while in selection mode
      disabled: selectionMode,
    });

  const dragStyle = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const url = item.content || "";
  const domain = getDomain(url);

  // Prefer scraped metadata; fall back gracefully
  const ogImage = !ogImgError ? (item.linkMetadata?.ogImage ?? null) : null;
  const ogDescription = item.linkMetadata?.ogDescription ?? null;
  const faviconUrl = !faviconError
    ? (item.linkMetadata?.faviconUrl ?? null)
    : null;

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

  function handleCardClick() {
    if (selectionMode) {
      onSelect?.(item.id);
    } else {
      setShowDetail(true);
    }
  }

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
            "group flex flex-col overflow-hidden cursor-pointer transition-all hover:bg-muted/50 hover:shadow-sm hover:border-border/80",
            isDragging && "opacity-50 ring-2 ring-primary",
            selectionMode && isSelected && "ring-2 ring-primary ring-offset-2",
          )}
          onClick={handleCardClick}
        >
          {/* OG Image Banner */}
          {ogImage && (
            <div className="relative h-32 w-full overflow-hidden bg-muted/40 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ogImage}
                alt=""
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                onError={() => setOgImgError(true)}
              />
              {/* Gradient overlay for readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            </div>
          )}

          <div className="flex flex-col gap-2.5 p-4">
            {/* Top row: favicon + title + actions */}
            <div className="flex items-start gap-2.5 w-full">
              {/* Favicon */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 overflow-hidden mt-0.5">
                {faviconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={faviconUrl}
                    alt=""
                    className="h-4 w-4 object-contain"
                    loading="lazy"
                    onError={() => setFaviconError(true)}
                  />
                ) : (
                  <LinkIcon className="h-4 w-4 text-indigo-500/70" />
                )}
              </div>

              {/* Title + domain */}
              <div className="min-w-0 flex-1 space-y-0.5">
                <p
                  className="text-sm font-semibold leading-snug line-clamp-2"
                  title={item.title}
                >
                  {item.title}
                </p>
                <p
                  className="text-xs text-muted-foreground truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  onClick={handleOpen}
                  title={url}
                >
                  {domain}
                </p>
              </div>

              {/* Actions — hidden in selection mode */}
              {!selectionMode && (
                <div
                  className="flex items-center gap-0.5 shrink-0 -mt-1 -mr-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleCopy}
                    title="Copy URL"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowReader(true);
                    }}
                    title="Reader Mode"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={handleOpen}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open Link
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowReader(true);
                          }}
                        >
                          <BookOpen className="mr-2 h-4 w-4" />
                          Reader Mode
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleCopy}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy URL
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowEdit(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
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
              )}
            </div>

            {/* OG Description */}
            {ogDescription && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {ogDescription}
              </p>
            )}

            {/* User note (if any) */}
            {item.note && !ogDescription && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {item.note}
              </p>
            )}

            {/* Footer: tags + date */}
            <div className="flex items-center justify-between pt-1 mt-auto w-full">
              {item.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1 overflow-hidden">
                  {item.tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 font-normal bg-muted/60"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {item.tags.length > 3 && (
                    <span className="text-[10px] text-muted-foreground ml-1 shrink-0">
                      +{item.tags.length - 3}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[11px] text-muted-foreground/60 italic">
                  No tags
                </span>
              )}
              <span className="text-[11px] text-muted-foreground font-mono bg-muted/40 px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap ml-2">
                {formatDate(item.createdAt)}
              </span>
            </div>
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

          <ReaderViewSheet
            item={item}
            open={showReader}
            onOpenChange={setShowReader}
          />

          <LinkDetailModal
            item={item}
            open={showEdit}
            onOpenChange={setShowEdit}
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
      )}
    </>
  );
}

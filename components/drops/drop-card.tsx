"use client";

import { useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  File,
  Download,
  Trash2,
  MoreVertical,
  FileJson,
  FileSpreadsheet,
  FileArchive,
  FileType,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RetentionBadge } from "./retention-badge";
import { PinButton } from "@/components/shared/pin-button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { usePinItem, useUnpinItem, useDeleteItem } from "@/hooks/use-items";
import type { ItemResponse } from "@/types/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type DropCardProps = {
  item: ItemResponse;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

function getFileIconInfo(mimeType: string) {
  let icon: React.ElementType = File;
  let color = "text-gray-500";
  let bgColor = "bg-gray-500/10";

  if (isImageMime(mimeType)) {
    icon = ImageIcon;
    color = "text-purple-500";
    bgColor = "bg-purple-500/10";
  } else if (mimeType === "application/pdf") {
    icon = FileText;
    color = "text-red-500";
    bgColor = "bg-red-500/10";
  } else if (mimeType.includes("word") || mimeType.includes("document") || mimeType.includes("wordprocessingml")) {
    icon = FileText;
    color = "text-blue-500";
    bgColor = "bg-blue-500/10";
  } else if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType.includes("spreadsheetml")) {
    icon = FileSpreadsheet;
    color = "text-green-500";
    bgColor = "bg-green-500/10";
  } else if (mimeType.includes("presentation") || mimeType.includes("powerpoint") || mimeType.includes("presentationml")) {
    icon = FileText;
    color = "text-orange-500";
    bgColor = "bg-orange-500/10";
  } else if (mimeType.includes("zip") || mimeType.includes("archive") || mimeType.includes("compressed")) {
    icon = FileArchive;
    color = "text-yellow-600";
    bgColor = "bg-yellow-600/10";
  } else if (mimeType.includes("json") || mimeType.includes("xml")) {
    icon = FileJson;
    color = "text-cyan-500";
    bgColor = "bg-cyan-500/10";
  } else if (mimeType.startsWith("text/")) {
    icon = FileText;
    color = "text-gray-500";
    bgColor = "bg-gray-500/10";
  }

  return { icon, color, bgColor };
}

export function DropCard({ item }: DropCardProps) {
  const [showDelete, setShowDelete] = useState(false);
  const pinItem = usePinItem();
  const unpinItem = useUnpinItem();
  const deleteItem = useDeleteItem();

  const fileAsset = item.fileAsset;
  const isImage = fileAsset ? isImageMime(fileAsset.mimeType) : false;
  const { icon: FileIcon, color, bgColor } = fileAsset
    ? getFileIconInfo(fileAsset.mimeType)
    : { icon: File, color: "text-gray-500", bgColor: "bg-gray-500/10" };

  function handlePin() {
    pinItem.mutate(item.id, {
      onSuccess: () => toast.success("Pinned permanently"),
      onError: () => toast.error("Failed to pin"),
    });
  }

  function handleUnpin() {
    unpinItem.mutate(item.id, {
      onSuccess: () => toast.success("Unpinned, will expire in 7 days"),
      onError: () => toast.error("Failed to unpin"),
    });
  }

  function handleDelete() {
    deleteItem.mutate(item.id, {
      onSuccess: () => {
        toast.success("Deleted");
        setShowDelete(false);
      },
      onError: () => toast.error("Failed to delete"),
    });
  }

  function handleDownload() {
    if (fileAsset?.downloadUrl) {
      window.open(fileAsset.downloadUrl, "_blank");
    }
  }

  return (
    <>
      <Card className="group overflow-hidden hover:shadow-md transition-shadow">
        {/* Thumbnail / Icon */}
        <div className="relative flex h-32 items-center justify-center bg-muted">
          {isImage && fileAsset?.downloadUrl ? (
            <img
              src={fileAsset.downloadUrl}
              alt={item.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className={cn("flex items-center justify-center w-16 h-16 rounded-2xl", bgColor)}>
              <FileIcon className={cn("w-8 h-8", color)} />
            </div>
          )}

          {/* Hover actions overlay */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 backdrop-blur-sm">
            <PinButton
              isPinned={item.isPinned}
              onPin={handlePin}
              onUnpin={handleUnpin}
              disabled={pinItem.isPending || unpinItem.isPending}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {!isImage && (
                <div className={cn("flex items-center justify-center w-6 h-6 rounded-md shrink-0", bgColor)}>
                  <FileIcon className={cn("w-3.5 h-3.5", color)} />
                </div>
              )}
              <p className="text-sm font-medium truncate">{item.title}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className="mr-2 h-3.5 w-3.5" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={item.isPinned ? handleUnpin : handlePin}>
                  {item.isPinned ? "Unpin" : "Pin"}
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

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{fileAsset ? formatSize(fileAsset.sizeBytes) : ""}</span>
            <span>{formatDate(item.createdAt)}</span>
          </div>

          <RetentionBadge expiresAt={item.expiresAt} isPinned={item.isPinned} />
        </div>
      </Card>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete file"
        description="This file will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={deleteItem.isPending}
      />
    </>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  X,
  Download,
  Share2,
  Trash2,
  Info,
  ChevronLeft,
  ChevronRight,
  File,
  FileText,
  FileArchive,
  FileJson,
  FileSpreadsheet,
  Music,
  Video,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShareDialog } from "./share-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useDeleteItem } from "@/hooks/use-items";
import type { ItemResponse } from "@/types/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isImage(mime: string) { return mime.startsWith("image/"); }
function isVideo(mime: string) { return mime.startsWith("video/"); }
function isAudio(mime: string) { return mime.startsWith("audio/"); }
function isPdf(mime: string) { return mime === "application/pdf"; }

function isSafeInline(mime: string) {
  return new Set([
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/avif",
    "video/mp4", "video/webm",
    "audio/mpeg", "audio/ogg",
    "application/pdf",
  ]).has(mime);
}

function getGenericIcon(mimeType: string) {
  if (mimeType === "application/pdf") return FileText;
  if (mimeType.includes("word") || mimeType.includes("document")) return FileText;
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return FileSpreadsheet;
  if (mimeType.includes("zip") || mimeType.includes("archive")) return FileArchive;
  if (mimeType.includes("json") || mimeType.includes("xml")) return FileJson;
  if (mimeType.startsWith("text/")) return FileText;
  if (mimeType.startsWith("video/")) return Video;
  if (mimeType.startsWith("audio/")) return Music;
  return File;
}

// ── props ─────────────────────────────────────────────────────────────────────

type MediaViewerProps = {
  item: ItemResponse | null;
  items: ItemResponse[];          // full list for prev/next
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (item: ItemResponse) => void; // called when user navigates to another item
};

// ── main component ────────────────────────────────────────────────────────────

export function MediaViewer({ item, items, open, onOpenChange, onNavigate }: MediaViewerProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Pinch-zoom state (images only)
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; dist: number } | null>(null);
  const deleteItem = useDeleteItem();

  const currentIndex = items.findIndex((i) => i.id === item?.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;

  const goNext = useCallback(() => {
    if (hasNext && onNavigate) {
      setScale(1); setTranslateX(0); setTranslateY(0);
      onNavigate(items[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, items, onNavigate]);

  const goPrev = useCallback(() => {
    if (hasPrev && onNavigate) {
      setScale(1); setTranslateX(0); setTranslateY(0);
      onNavigate(items[currentIndex - 1]);
    }
  }, [hasPrev, currentIndex, items, onNavigate]);

  // Reset zoom when item changes
  useEffect(() => {
    setScale(1); setTranslateX(0); setTranslateY(0);
  }, [item?.id]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") onOpenChange(false);
      else if (e.key === " " && videoRef.current) {
        e.preventDefault();
        if (videoRef.current.paused) videoRef.current.play();
        else videoRef.current.pause();
      } else if (e.key === "i" || e.key === "I") {
        setShowInfo((v) => !v);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, goNext, goPrev, onOpenChange]);

  // Touch gestures
  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dist: 0 };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY,
      );
      touchStartRef.current = { x: 0, y: 0, dist };
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStartRef.current) return;
    if (e.changedTouches.length === 1 && touchStartRef.current.dist === 0) {
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
        if (dx < 0) goNext(); else goPrev();
      } else if (dy > 80 && Math.abs(dx) < 50) {
        onOpenChange(false);
      }
    }
    touchStartRef.current = null;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && touchStartRef.current && touchStartRef.current.dist > 0) {
      const dist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY,
      );
      const ratio = dist / touchStartRef.current.dist;
      setScale((s) => Math.min(Math.max(s * ratio, 0.5), 5));
      touchStartRef.current = { ...touchStartRef.current, dist };
    }
  }

  function handleDownload() {
    const fa = item?.fileAsset;
    if (!fa?.downloadUrl) return;
    const a = document.createElement("a");
    a.href = fa.downloadUrl;
    a.download = fa.originalName || item?.title || "download";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handleDelete() {
    if (!item) return;
    deleteItem.mutate(item.id, {
      onSuccess: () => {
        toast.success("Deleted");
        setShowDelete(false);
        onOpenChange(false);
      },
      onError: () => toast.error("Failed to delete"),
    });
  }

  if (!item) return null;
  const fa = item.fileAsset;
  const mime = fa?.mimeType ?? "";
  const url = fa?.downloadUrl ?? null;
  const canPreviewInline = url && isSafeInline(mime);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "max-w-none w-screen h-screen p-0 gap-0 border-0 rounded-none",
            "bg-zinc-950 text-white flex flex-col",
            "[&>button]:hidden" // hide default close button — we have our own
          )}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
        >
          {/* ── Toolbar ──────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 backdrop-blur-sm border-b border-white/5 shrink-0 z-10">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="text-sm font-medium text-zinc-100 truncate">
                {item.title || fa?.originalName || "File"}
              </span>
              {fa?.mimeType && (
                <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-700 shrink-0 hidden sm:flex">
                  {fa.mimeType}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10"
                title="Download (D)"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowShare(true)}
                className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10"
                title="Share"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowInfo((v) => !v)}
                className={cn(
                  "h-8 w-8 hover:text-white hover:bg-white/10",
                  showInfo ? "text-white bg-white/10" : "text-zinc-400"
                )}
                title="Info (I)"
              >
                <Info className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDelete(true)}
                className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10"
                title="Close (Esc)"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ── Main area ─────────────────────────────────────────────────── */}
          <div className="flex flex-1 min-h-0">
            {/* Media pane */}
            <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-zinc-950">
              {/* Prev / Next arrows */}
              {hasPrev && (
                <button
                  onClick={goPrev}
                  className="absolute left-3 z-10 hidden sm:flex items-center justify-center h-10 w-10 rounded-full bg-black/50 hover:bg-black/80 text-white transition-all backdrop-blur-sm"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              {hasNext && (
                <button
                  onClick={goNext}
                  className="absolute right-3 z-10 hidden sm:flex items-center justify-center h-10 w-10 rounded-full bg-black/50 hover:bg-black/80 text-white transition-all backdrop-blur-sm"
                  aria-label="Next"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}

              {/* ── Media renderer ──────────────────────────────────────── */}
              {canPreviewInline && isImage(mime) && (
                <img
                  key={item.id}
                  src={url}
                  alt={item.title}
                  className="max-h-full max-w-full object-contain select-none"
                  style={{
                    transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
                    transition: scale !== 1 ? "none" : "transform 0.2s ease",
                  }}
                  draggable={false}
                />
              )}

              {canPreviewInline && isVideo(mime) && (
                <video
                  key={item.id}
                  ref={videoRef}
                  src={url}
                  controls
                  autoPlay
                  className="max-h-full max-w-full"
                  style={{ outline: "none" }}
                />
              )}

              {canPreviewInline && isAudio(mime) && (
                <div className="flex flex-col items-center gap-6 p-8">
                  <div className="flex items-center justify-center w-32 h-32 rounded-3xl bg-zinc-800 shadow-xl">
                    <Music className="w-16 h-16 text-zinc-400" />
                  </div>
                  <p className="text-lg font-medium text-zinc-200 text-center">
                    {item.title || fa?.originalName}
                  </p>
                  <audio key={item.id} src={url} controls autoPlay className="w-full max-w-sm" />
                </div>
              )}

              {canPreviewInline && isPdf(mime) && (
                <iframe
                  key={item.id}
                  src={url}
                  className="w-full h-full border-0"
                  title={item.title || "PDF preview"}
                />
              )}

              {/* Fallback — non-previewable type */}
              {(!canPreviewInline || (!isImage(mime) && !isVideo(mime) && !isAudio(mime) && !isPdf(mime))) && (
                <div className="flex flex-col items-center gap-6 p-8 text-center">
                  {(() => {
                    const Icon = getGenericIcon(mime);
                    return <Icon className="w-20 h-20 text-zinc-500" />;
                  })()}
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-zinc-200">
                      {item.title || fa?.originalName}
                    </p>
                    <p className="text-sm text-zinc-500">
                      This file type cannot be previewed in the browser.
                    </p>
                  </div>
                  <Button
                    onClick={handleDownload}
                    className="gap-2 bg-zinc-700 hover:bg-zinc-600 text-white"
                  >
                    <Download className="h-4 w-4" />
                    Download file
                  </Button>
                </div>
              )}
            </div>

            {/* Info panel */}
            {showInfo && fa && (
              <aside className="w-72 shrink-0 bg-zinc-900 border-l border-white/5 overflow-y-auto">
                <div className="p-5 space-y-5">
                  <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                    File info
                  </h2>

                  <InfoRow label="Name" value={fa.originalName} mono />
                  <InfoRow label="Type" value={fa.mimeType} mono />
                  <InfoRow label="Size" value={formatSize(fa.sizeBytes)} />
                  <InfoRow label="Uploaded" value={formatDate(item.createdAt)} />

                  {fa.metadata?.width && fa.metadata?.height && (
                    <InfoRow
                      label="Dimensions"
                      value={`${fa.metadata.width} × ${fa.metadata.height} px`}
                    />
                  )}
                  {fa.metadata?.duration != null && (
                    <InfoRow
                      label="Duration"
                      value={`${Math.floor(fa.metadata.duration / 60)}m ${Math.round(fa.metadata.duration % 60)}s`}
                    />
                  )}
                  {fa.metadata?.pageCount != null && (
                    <InfoRow label="Pages" value={`${fa.metadata.pageCount}`} />
                  )}

                  {item.tags && item.tags.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {item.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px] text-zinc-400 border-zinc-700">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {item.note && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Note</p>
                      <p className="text-sm text-zinc-300 leading-relaxed">{item.note}</p>
                    </div>
                  )}
                </div>
              </aside>
            )}
          </div>

          {/* ── Bottom nav strip (mobile) ─────────────────────────────────── */}
          {(hasPrev || hasNext) && (
            <div className="flex sm:hidden items-center justify-between px-4 py-3 bg-zinc-900/80 border-t border-white/5 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                disabled={!hasPrev}
                onClick={goPrev}
                className="text-zinc-300 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <span className="text-xs text-zinc-500 tabular-nums">
                {currentIndex + 1} / {items.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={!hasNext}
                onClick={goNext}
                className="text-zinc-300 hover:text-white disabled:opacity-30"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

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

      {item && (
        <ShareDialog
          itemId={item.id}
          itemTitle={item.title}
          open={showShare}
          onOpenChange={setShowShare}
        />
      )}
    </>
  );
}

// ── sub-component ─────────────────────────────────────────────────────────────

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className={cn("text-sm text-zinc-200 break-all", mono && "font-mono text-xs")}>{value}</p>
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  History,
  MessageSquare,
  Send,
  Trash2,
  Upload,
  RotateCcw,
  Loader2,
  FileText,
  Calendar,
  HardDrive,
  Tag,
  Folder,
  Clock,
  Eye,
  Pencil,
  CheckCircle2,
  Activity,
  Share2,
  BarChart2,
  Lock,
  Globe,
  Copy,
  Check,
  RefreshCw,
  WifiOff,
  Wifi,
  Download,
  Maximize2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useItemVersions, useUploadVersion, useRevertVersion } from "@/hooks/use-versions";
import { useItemComments, useCreateComment, useDeleteComment } from "@/hooks/use-comments";
import { useShare, useCreateShare, useRevokeShare, useShareAnalytics } from "@/hooks/use-share";
import { useMarkOffline, useRemoveOffline } from "@/hooks/use-offline";
import { cacheFileForOffline, removeCachedFile } from "@/lib/offline-storage";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { ItemResponse, ItemVersionResponse, ItemCommentResponse } from "@/types/api";

type Props = {
  item: ItemResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenPreview?: () => void;
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── File preview thumbnail ────────────────────────────────────────────────────
function FilePreview({ item, onOpenPreview }: { item: ItemResponse; onOpenPreview?: () => void }) {
  const fa = item.fileAsset;
  if (!fa) return null;

  const isImage = fa.mimeType?.startsWith("image/");

  if (isImage && fa.downloadUrl) {
    return (
      <div
        className={cn(
          "relative w-full aspect-video rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center",
          onOpenPreview && "cursor-pointer group/preview"
        )}
        onClick={onOpenPreview}
        role={onOpenPreview ? "button" : undefined}
        aria-label={onOpenPreview ? "Open preview" : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fa.downloadUrl}
          alt={item.title}
          className="object-contain w-full h-full"
        />
        {onOpenPreview && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/preview:bg-black/30 transition-colors pointer-events-none">
            <Maximize2 className="size-6 text-white opacity-0 group-hover/preview:opacity-100 transition-opacity drop-shadow-lg" />
          </div>
        )}
      </div>
    );
  }

  const ext = fa.originalName.split(".").pop()?.toUpperCase() ?? "FILE";
  return (
    <div className="w-full aspect-video rounded-xl bg-zinc-100 dark:bg-zinc-800 flex flex-col items-center justify-center gap-2 text-muted-foreground">
      <FileText className="size-12 opacity-40" />
      <span className="text-sm font-semibold tracking-wider">{ext}</span>
    </div>
  );
}

// ── Details grid ─────────────────────────────────────────────────────────────
function DetailsGrid({ item }: { item: ItemResponse }) {
  const fa = item.fileAsset;
  const rows: { label: string; value: React.ReactNode; icon: React.ElementType }[] = [
    {
      label: "Type",
      icon: FileText,
      value: fa?.mimeType ?? "—",
    },
    {
      label: "Size",
      icon: HardDrive,
      value: fa ? formatBytes(fa.sizeBytes) : "—",
    },
    {
      label: "Created",
      icon: Calendar,
      value: format(new Date(item.createdAt), "PPP"),
    },
    {
      label: "Expires",
      icon: Clock,
      value: item.expiresAt
        ? format(new Date(item.expiresAt), "PPP")
        : item.isPinned
        ? "Never (pinned)"
        : "—",
    },
    {
      label: "Tags",
      icon: Tag,
      value:
        item.tags && item.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {item.tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs">
                {t}
              </Badge>
            ))}
          </div>
        ) : (
          "—"
        ),
    },
    {
      label: "Collection",
      icon: Folder,
      value: item.collectionId ?? "None",
    },
  ];

  return (
    <div className="grid grid-cols-[28px_110px_1fr] gap-y-3 gap-x-2 items-start text-sm">
      {rows.map(({ label, value, icon: Icon }) => (
        <div key={label} className="contents">
          <Icon className="size-4 text-muted-foreground mt-0.5" />
          <span className="text-muted-foreground font-medium">{label}</span>
          <span className="text-foreground break-all">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Versions tab ─────────────────────────────────────────────────────────────
function VersionsTab({
  item,
  workspaceId,
}: {
  item: ItemResponse;
  workspaceId: string;
}) {
  const { data: versions = [], isLoading } = useItemVersions(item.id);
  const uploadVersion = useUploadVersion();
  const revertVersion = useRevertVersion();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [revertTarget, setRevertTarget] = useState<ItemVersionResponse | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadVersion.mutate(
      { itemId: item.id, workspaceId, file },
      {
        onSuccess: () => toast.success("New version uploaded"),
        onError: (err) => toast.error(err.message || "Upload failed"),
      },
    );
    // reset so the same file can be selected again
    e.target.value = "";
  }

  function confirmRevert() {
    if (!revertTarget) return;
    revertVersion.mutate(
      { itemId: item.id, versionId: revertTarget.id, workspaceId },
      {
        onSuccess: () => {
          toast.success(`Reverted to version ${revertTarget.versionNumber}`);
          setRevertTarget(null);
        },
        onError: (err) => {
          toast.error(err.message || "Revert failed");
          setRevertTarget(null);
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {versions.length} snapshot{versions.length !== 1 ? "s" : ""} stored
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={uploadVersion.isPending}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-xl"
        >
          {uploadVersion.isPending ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Upload className="size-4 mr-2" />
          )}
          Upload New Version
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Current version badge */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-primary/20 bg-primary/5">
        <CheckCircle2 className="size-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {item.fileAsset?.originalName ?? item.title}
          </p>
          <p className="text-xs text-muted-foreground">
            Current version • {item.fileAsset ? formatBytes(item.fileAsset.sizeBytes) : ""}
          </p>
        </div>
        <Badge variant="default" className="shrink-0 text-xs">
          Current
        </Badge>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && versions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No previous versions. Upload a new version to start tracking history.
        </p>
      )}

      {!isLoading && versions.length > 0 && (
        <div className="space-y-2">
          {versions.map((v) => (
            <div
              key={v.id}
              className="flex items-start gap-3 px-3 py-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/50 group"
            >
              <div className="flex items-center justify-center size-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-muted-foreground shrink-0 mt-0.5">
                v{v.versionNumber}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {v.label ?? v.fileAsset?.originalName ?? `Version ${v.versionNumber}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
                  {v.fileAsset && ` • ${formatBytes(v.fileAsset.sizeBytes)}`}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 h-7 text-xs rounded-lg hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-900/20 dark:hover:text-amber-400"
                onClick={() => setRevertTarget(v)}
              >
                <RotateCcw className="size-3 mr-1" />
                Revert
              </Button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!revertTarget}
        onOpenChange={(o) => { if (!o) setRevertTarget(null); }}
        title={`Revert to version ${revertTarget?.versionNumber}?`}
        description="The current file will be snapshotted and the item will be restored to the selected version. This cannot be undone."
        confirmLabel="Revert"
        onConfirm={confirmRevert}
        variant="destructive"
      />
    </div>
  );
}

// ── Comments tab ─────────────────────────────────────────────────────────────
function CommentsTab({
  item,
  workspaceId,
}: {
  item: ItemResponse;
  workspaceId: string;
}) {
  const { data: comments = [], isLoading } = useItemComments(item.id);
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const [body, setBody] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ItemCommentResponse | null>(null);

  function handleSend() {
    if (!body.trim()) return;
    createComment.mutate(
      { itemId: item.id, workspaceId, body: body.trim() },
      {
        onSuccess: () => {
          setBody("");
          setIsPreview(false);
        },
        onError: (err) => toast.error(err.message || "Failed to post comment"),
      },
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteComment.mutate(
      { itemId: item.id, commentId: deleteTarget.id, workspaceId },
      {
        onSuccess: () => {
          toast.success("Comment deleted");
          setDeleteTarget(null);
        },
        onError: (err) => {
          toast.error(err.message || "Failed to delete comment");
          setDeleteTarget(null);
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      {/* Compose */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <button
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-md transition-colors",
              !isPreview
                ? "bg-zinc-100 dark:bg-zinc-800 text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setIsPreview(false)}
          >
            <Pencil className="size-3 inline mr-1" />
            Write
          </button>
          <button
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-md transition-colors",
              isPreview
                ? "bg-zinc-100 dark:bg-zinc-800 text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setIsPreview(true)}
          >
            <Eye className="size-3 inline mr-1" />
            Preview
          </button>
        </div>

        {isPreview ? (
          <div className="min-h-[80px] px-3 py-2 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900 text-sm prose dark:prose-invert prose-sm max-w-none">
            {body.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground italic">Nothing to preview.</p>
            )}
          </div>
        ) : (
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment… (⌘↵ to send)"
            className="min-h-[80px] resize-none rounded-xl border-zinc-200/60 dark:border-zinc-800/60 text-sm"
          />
        )}

        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={!body.trim() || createComment.isPending}
            onClick={handleSend}
            className="rounded-xl"
          >
            {createComment.isPending ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Send className="size-4 mr-2" />
            )}
            Comment
          </Button>
        </div>
      </div>

      <Separator />

      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && comments.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No comments yet. Be the first to add one.
        </p>
      )}

      {!isLoading && comments.length > 0 && (
        <div className="space-y-5">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 group">
              <Avatar className="size-8 shrink-0">
                <AvatarImage src={c.author?.image ?? ""} />
                <AvatarFallback className="text-xs">
                  {c.author?.name ? initials(c.author.name) : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground">
                    {c.author?.name ?? c.author?.email ?? "Unknown"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                  </span>
                  <button
                    className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(c)}
                    aria-label="Delete comment"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <div className="prose dark:prose-invert prose-sm max-w-none text-sm text-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {c.body}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Delete comment?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  );
}

// ── Activity tab ─────────────────────────────────────────────────────────────
function ActivityTab({
  item,
  workspaceId,
}: {
  item: ItemResponse;
  workspaceId: string;
}) {
  const { data, isLoading } = useItemVersions(item.id);
  const { data: comments = [] } = useItemComments(item.id);

  // Build a simple combined timeline from versions + comments
  type Event = { id: string; at: string; label: string };
  const events: Event[] = [];

  events.push({
    id: "created",
    at: item.createdAt,
    label: "File created",
  });

  if (data) {
    for (const v of data) {
      events.push({
        id: `v-${v.id}`,
        at: v.createdAt,
        label: `Version ${v.versionNumber} snapshot${v.label ? ` — ${v.label}` : ""}`,
      });
    }
  }

  for (const c of comments) {
    events.push({
      id: `c-${c.id}`,
      at: c.createdAt,
      label: `Comment by ${c.author?.name ?? "someone"}`,
    });
  }

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div className="space-y-3">
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-2 rounded-full" />
              <Skeleton className="h-3 flex-1" />
            </div>
          ))}
        </div>
      )}
      {!isLoading && events.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No activity recorded.
        </p>
      )}
      {!isLoading && events.length > 0 && (
        <div className="relative pl-5 space-y-4">
          <div className="absolute left-1.5 top-2 bottom-2 w-px bg-zinc-200 dark:bg-zinc-700" />
          {events.map((e) => (
            <div key={e.id} className="relative flex items-start gap-3">
              <div className="absolute -left-[13px] top-1.5 size-2.5 rounded-full bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{e.label}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(e.at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Offline availability toggle ───────────────────────────────────────────────
function OfflineToggle({ item }: { item: ItemResponse }) {
  const markOffline = useMarkOffline(item.id);
  const removeOffline = useRemoveOffline(item.id);
  const isOffline = item.availableOffline;
  const isPending = markOffline.isPending || removeOffline.isPending;

  async function handleToggle() {
    if (isOffline) {
      removeOffline.mutate(undefined, {
        onSuccess: async () => {
          if (item.fileAsset?.downloadUrl) {
            await removeCachedFile(item.fileAsset.downloadUrl);
          }
          toast.success("Removed from offline storage");
        },
        onError: (err) => toast.error(err.message),
      });
    } else {
      markOffline.mutate(undefined, {
        onSuccess: async (updated) => {
          const url = updated.fileAsset?.downloadUrl;
          if (url) {
            try {
              await cacheFileForOffline(url);
              toast.success("File cached for offline access");
            } catch {
              toast.warning("Marked offline but caching failed — check your connection");
            }
          } else {
            toast.success("Marked as available offline");
          }
        },
        onError: (err) => toast.error(err.message),
      });
    }
  }

  // Only show for file drops
  if (item.type !== "drop" || !item.fileAssetId) return null;

  return (
    <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3">
      <div className="flex items-center gap-3">
        {isOffline ? (
          <Wifi className="size-4 text-emerald-500" />
        ) : (
          <WifiOff className="size-4 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-medium">Available Offline</p>
          <p className="text-xs text-muted-foreground">
            {isOffline ? "Cached on this device" : "Cache file for offline viewing"}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant={isOffline ? "secondary" : "outline"}
        onClick={handleToggle}
        disabled={isPending}
        className="text-xs"
      >
        {isPending ? (
          <Loader2 className="size-3 animate-spin" />
        ) : isOffline ? (
          "Remove"
        ) : (
          "Cache"
        )}
      </Button>
    </div>
  );
}

// ── Share tab ─────────────────────────────────────────────────────────────────
function ShareTab({
  item,
  workspaceId,
}: {
  item: ItemResponse;
  workspaceId: string;
}) {
  const { data: share, isLoading } = useShare(item.id);
  const { data: analytics, isFetching: analyticsLoading, refetch } = useShareAnalytics(
    share ? item.id : null,
  );
  const createShare = useCreateShare();
  const revokeShare = useRevokeShare();
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  async function handleCopy() {
    if (!share?.shareUrl) return;
    await navigator.clipboard.writeText(share.shareUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCreate() {
    createShare.mutate(
      { itemId: item.id, workspaceId },
      {
        onSuccess: () => toast.success("Share link created"),
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function handleRevoke() {
    revokeShare.mutate(
      { itemId: item.id, workspaceId },
      {
        onSuccess: () => {
          setConfirmRevoke(false);
          toast.success("Share link revoked");
        },
        onError: (err) => {
          setConfirmRevoke(false);
          toast.error(err.message);
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!share ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Share this item with anyone via a public link.
          </p>
          <Button
            size="sm"
            className="w-full rounded-xl"
            onClick={handleCreate}
            disabled={createShare.isPending}
          >
            {createShare.isPending ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Globe className="size-4 mr-2" />
            )}
            Create Share Link
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-xl border border-green-200 dark:border-green-800">
            <Globe className="h-4 w-4 text-green-600 shrink-0" />
            <p className="text-xs text-green-700 dark:text-green-300 flex-1 truncate">
              {share.shareUrl}
            </p>
            {share.isPasswordProtected && (
              <Lock className="h-3.5 w-3.5 text-green-600 shrink-0" />
            )}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="size-4 mr-2 text-green-600" />
              ) : (
                <Copy className="size-4 mr-2" />
              )}
              {copied ? "Copied" : "Copy Link"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-destructive hover:text-destructive"
              onClick={() => setConfirmRevoke(true)}
              disabled={revokeShare.isPending}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>

          {/* Analytics mini-summary */}
          <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <BarChart2 className="size-3.5" />
                Analytics
              </p>
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5"
                onClick={() => refetch()}
                disabled={analyticsLoading}
              >
                <RefreshCw className={`size-3 ${analyticsLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="text-center">
                <p className="text-lg font-semibold tabular-nums">{share.accessCount}</p>
                <p className="text-xs text-muted-foreground">Total views</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold tabular-nums">
                  {analytics?.last30Days ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </div>
            </div>

            {analytics && analytics.dailyCounts.length > 0 && (
              <div className="flex items-end gap-0.5 h-10">
                {(() => {
                  const maxCount = Math.max(...analytics.dailyCounts.map((d) => d.count), 1);
                  return analytics.dailyCounts.map((d) => (
                    <div
                      key={d.date}
                      title={`${d.date}: ${d.count}`}
                      className="flex-1 bg-primary/60 rounded-sm min-h-[2px]"
                      style={{ height: `${Math.max(2, (d.count / maxCount) * 100)}%` }}
                    />
                  ));
                })()}
              </div>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="size-3" />
                {share.maxViews
                  ? `${share.accessCount} / ${share.maxViews} max`
                  : "Unlimited views"}
              </span>
              {share.burnAfterReading && (
                <span className="text-amber-600 dark:text-amber-400">Burn after reading</span>
              )}
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmRevoke}
        onOpenChange={setConfirmRevoke}
        title="Revoke share link?"
        description="Anyone with this link will no longer be able to access the item."
        confirmLabel="Revoke"
        onConfirm={handleRevoke}
        variant="destructive"
      />
    </div>
  );
}

// ── Main sheet ────────────────────────────────────────────────────────────────
export function DropDetailSheet({ item, open, onOpenChange, onOpenPreview }: Props) {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  if (!item || !activeWorkspaceId) return null;

  const currentItem = item;
  const fa = currentItem.fileAsset;
  const isImage = fa?.mimeType?.startsWith("image/");

  function handleDownload() {
    if (fa?.downloadUrl) {
      const a = document.createElement("a");
      a.href = fa.downloadUrl;
      a.download = fa.originalName || currentItem.title || "download";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="sm:max-w-xl w-full p-0 flex flex-col gap-0 border-l border-zinc-200 dark:border-zinc-800"
        side="right"
      >
        <SheetHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-zinc-200/60 dark:border-zinc-800/60">
          <SheetTitle className="text-base font-semibold text-foreground truncate">
            {currentItem.title}
          </SheetTitle>
          {fa && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {fa.mimeType} • {formatBytes(fa.sizeBytes)}
            </p>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Preview */}
            <FilePreview item={currentItem} onOpenPreview={onOpenPreview} />

            {/* Quick actions */}
            {fa && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl"
                  onClick={handleDownload}
                >
                  <Download className="size-4 mr-2" />
                  Download
                </Button>
                {isImage && onOpenPreview && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-xl"
                    onClick={onOpenPreview}
                  >
                    <Maximize2 className="size-4 mr-2" />
                    Preview
                  </Button>
                )}
              </div>
            )}

            {/* Details */}
            <DetailsGrid item={currentItem} />

            {/* Offline availability (file drops only) */}
            <OfflineToggle item={currentItem} />

            <Separator />

            {/* Tabs */}
            <Tabs defaultValue="versions">
              <TabsList className="w-full grid grid-cols-4 h-9 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
                <TabsTrigger
                  value="versions"
                  className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm"
                >
                  <History className="size-3.5" />
                  <span className="hidden sm:inline">Versions</span>
                </TabsTrigger>
                <TabsTrigger
                  value="comments"
                  className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm"
                >
                  <MessageSquare className="size-3.5" />
                  <span className="hidden sm:inline">Comments</span>
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm"
                >
                  <Activity className="size-3.5" />
                  <span className="hidden sm:inline">Activity</span>
                </TabsTrigger>
                <TabsTrigger
                  value="share"
                  className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm"
                >
                  <Share2 className="size-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="versions" className="mt-4">
                <VersionsTab item={currentItem} workspaceId={activeWorkspaceId} />
              </TabsContent>

              <TabsContent value="comments" className="mt-4">
                <CommentsTab item={currentItem} workspaceId={activeWorkspaceId} />
              </TabsContent>

              <TabsContent value="activity" className="mt-4">
                <ActivityTab item={currentItem} workspaceId={activeWorkspaceId} />
              </TabsContent>

              <TabsContent value="share" className="mt-4">
                <ShareTab item={currentItem} workspaceId={activeWorkspaceId} />
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

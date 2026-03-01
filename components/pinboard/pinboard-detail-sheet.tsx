"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ExternalLink,
  Copy,
  Trash2,
  Tag,
  Calendar,
  MessageSquare,
  Activity,
  Send,
  Loader2,
  Pencil,
  Eye,
  StickyNote,
  Link as LinkIcon,
  Check,
  Lock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useItemComments, useCreateComment, useDeleteComment } from "@/hooks/use-comments";
import { useDeleteItem } from "@/hooks/use-items";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { LinkDetailModal } from "./link-detail-modal";
import { NoteDetailModal } from "./note-detail-modal";
import type { ItemResponse, ItemCommentResponse } from "@/types/api";

type Props = {
  item: ItemResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── Info panel ────────────────────────────────────────────────────────────────
function InfoTab({ item }: { item: ItemResponse }) {
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockedContent, setUnlockedContent] = useState<string | null>(null);

  function handleCopy() {
    const text = item.type === "link" ? (item.content ?? "") : (item.content ?? "");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success(item.type === "link" ? "URL copied" : "Content copied");
    });
  }

  async function handleUnlock() {
    if (!password.trim()) return;
    setIsUnlocking(true);
    try {
      const res = await fetch(`/api/v1/items/${item.id}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error?.message || "Incorrect password");
        return;
      }
      setUnlockedContent(json.data?.content ?? "");
      setPassword("");
      toast.success("Note unlocked");
    } catch {
      toast.error("Failed to unlock note");
    } finally {
      setIsUnlocking(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Link-specific: OG image + URL */}
      {item.type === "link" && (
        <>
          {item.linkMetadata?.ogImage && (
            <div className="rounded-xl overflow-hidden bg-muted/40 aspect-video">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.linkMetadata.ogImage}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">URL</p>
            <div className="flex items-center gap-2">
              <a
                href={item.content ?? ""}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline truncate flex-1 min-w-0"
              >
                {item.content}
              </a>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCopy}>
                {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
                <a href={item.content ?? ""} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
            </div>
          </div>
          {item.linkMetadata?.ogDescription && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.linkMetadata.ogDescription}</p>
            </div>
          )}
        </>
      )}

      {/* Note-specific: protected lock form */}
      {item.type === "note" && item.isProtected && unlockedContent === null && (
        <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900 px-4 py-5 space-y-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="p-3 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
              <Lock className="size-5" />
            </div>
            <p className="text-sm font-medium text-foreground">This note is password-protected</p>
            <p className="text-xs text-muted-foreground">Enter the password to view its contents.</p>
          </div>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              className="flex-1 h-9 text-sm rounded-lg"
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleUnlock}
              disabled={!password.trim() || isUnlocking}
              className="rounded-lg h-9 px-4"
            >
              {isUnlocking ? <Loader2 className="size-4 animate-spin" /> : "Unlock"}
            </Button>
          </div>
        </div>
      )}

      {/* Note-specific: unlocked protected content */}
      {item.type === "note" && item.isProtected && unlockedContent !== null && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Content</p>
            <Lock className="size-3 text-amber-500" />
          </div>
          <div
            className="text-sm text-foreground leading-relaxed rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 max-h-64 overflow-y-auto
              [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4
              [&_strong]:font-semibold [&_em]:italic [&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:text-[0.85em] [&_code]:font-mono"
            dangerouslySetInnerHTML={{ __html: unlockedContent }}
          />
        </div>
      )}

      {/* Note-specific: unprotected content preview */}
      {item.type === "note" && !item.isProtected && item.content && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Content</p>
          <div
            className="text-sm text-foreground leading-relaxed rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 max-h-64 overflow-y-auto
              [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4
              [&_strong]:font-semibold [&_em]:italic [&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:text-[0.85em] [&_code]:font-mono"
            dangerouslySetInnerHTML={{ __html: item.content }}
          />
        </div>
      )}

      {/* User note (for links) */}
      {item.type === "link" && item.note && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Note</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{item.note}</p>
        </div>
      )}

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <Tag className="size-3" /> Tags
          </div>
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Dates */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <Calendar className="size-3" /> Details
        </div>
        <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 divide-y divide-zinc-100 dark:divide-zinc-800">
          <div className="flex justify-between px-3 py-2 text-xs">
            <span className="text-muted-foreground">Created</span>
            <span className="font-medium">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
          </div>
          {item.expiresAt && (
            <div className="flex justify-between px-3 py-2 text-xs">
              <span className="text-muted-foreground">Expires</span>
              <span className="font-medium text-amber-600">{formatDistanceToNow(new Date(item.expiresAt), { addSuffix: true })}</span>
            </div>
          )}
        </div>
      </div>
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
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{c.body}</ReactMarkdown>
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

// ── Activity tab ──────────────────────────────────────────────────────────────
function ActivityTab({ item }: { item: ItemResponse }) {
  const { data: comments = [], isLoading } = useItemComments(item.id);

  type Event = { id: string; at: string; label: string };
  const events: Event[] = [];

  events.push({ id: "created", at: item.createdAt, label: `${item.type === "link" ? "Link" : "Note"} created` });

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
        <p className="text-sm text-muted-foreground text-center py-4">No activity recorded.</p>
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

// ── Main sheet ────────────────────────────────────────────────────────────────
export function PinboardDetailSheet({ item, open, onOpenChange }: Props) {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const deleteItem = useDeleteItem();
  const [showDelete, setShowDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  if (!item) return null;

  const isLink = item.type === "link";

  function handleDelete() {
    if (!item) return;
    deleteItem.mutate(item.id, {
      onSuccess: () => {
        toast.success(`${isLink ? "Link" : "Note"} deleted`);
        setShowDelete(false);
        onOpenChange(false);
      },
      onError: (err) => toast.error(err.message || "Failed to delete"),
    });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
          {/* Header */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-zinc-200/60 dark:border-zinc-800/60 shrink-0">
            <div className="flex items-start gap-3">
              <div className={cn(
                "p-2 rounded-lg shrink-0",
                isLink
                  ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                  : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
              )}>
                {isLink ? <LinkIcon className="size-4" /> : <StickyNote className="size-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-base font-semibold leading-snug line-clamp-2">
                  {item.title}
                </SheetTitle>
                {isLink && item.content && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {(() => {
                      try { return new URL(item.content).hostname.replace("www.", ""); } catch { return item.content; }
                    })()}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground -mt-1"
                onClick={() => setShowEdit(true)}
                title="Edit"
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10 -mt-1"
                onClick={() => setShowDelete(true)}
                title="Delete"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </SheetHeader>

          {/* Tabs */}
          <Tabs defaultValue="info" className="flex-1 flex flex-col min-h-0">
            <TabsList className="mx-6 mt-4 mb-0 shrink-0 w-auto self-start">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="comments">
                <MessageSquare className="size-3.5 mr-1.5" />
                Comments
              </TabsTrigger>
              <TabsTrigger value="activity">
                <Activity className="size-3.5 mr-1.5" />
                Activity
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 px-6 py-4">
              <TabsContent value="info" className="mt-0 pb-6">
                <InfoTab item={item} />
              </TabsContent>
              <TabsContent value="comments" className="mt-0 pb-6">
                {activeWorkspaceId && (
                  <CommentsTab item={item} workspaceId={activeWorkspaceId} />
                )}
              </TabsContent>
              <TabsContent value="activity" className="mt-0 pb-6">
                <ActivityTab item={item} />
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title={`Delete ${isLink ? "link" : "note"}?`}
        description={`Are you sure you want to delete "${item.title}"? This cannot be undone.`}
        confirmLabel="Delete permanently"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={deleteItem.isPending}
      />

      {isLink ? (
        <LinkDetailModal
          item={item}
          open={showEdit}
          onOpenChange={setShowEdit}
        />
      ) : (
        <NoteDetailModal
          item={item}
          open={showEdit}
          onOpenChange={setShowEdit}
        />
      )}
    </>
  );
}

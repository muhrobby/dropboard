"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, StickyNote, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/shared/tag-input";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/pinboard/rich-text-editor";
import { useCreateNote } from "@/hooks/use-items";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useSubscription } from "@/hooks/use-subscription";
import { toast } from "sonner";

type AddNoteFormProps = {
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function AddNoteForm({ onSuccess, onCancel }: AddNoteFormProps) {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const createNote = useCreateNote();
  const { data: subscription } = useSubscription();
  const isFreeTier = subscription?.plan === "Free";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("<p></p>");
  const [tags, setTags] = useState<string[]>([]);
  const [isProtected, setIsProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [retentionDays, setRetentionDays] = useState("");
  const [maxDownloads, setMaxDownloads] = useState("");

  function reset() {
    setTitle("");
    setContent("<p></p>");
    setTags([]);
    setIsProtected(false);
    setPassword("");
    setRetentionDays("");
    setMaxDownloads("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const isContentEmpty = !content || content === "<p></p>" || content.replace(/<[^>]+>/g, "").trim() === "";
    if (!title.trim() || isContentEmpty || !activeWorkspaceId) return;
    if (isProtected && !password.trim()) {
      toast.error("Password is required for protected notes");
      return;
    }

    try {
      await createNote.mutateAsync({
        workspaceId: activeWorkspaceId,
        title: title.trim(),
        content,
        password: isProtected ? password.trim() : undefined,
        tags: tags.length > 0 ? tags : undefined,
        retentionDays: retentionDays ? parseInt(retentionDays, 10) : undefined,
        maxDownloads: maxDownloads ? parseInt(maxDownloads, 10) : undefined,
      });
      toast.success("Note saved");
      reset();
      onSuccess?.();
    } catch {
      toast.error("Failed to save note");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="note-title" className="text-sm font-medium">Title <span className="text-red-500">*</span></Label>
        <div className="relative">
          <StickyNote className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="note-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
            className="pl-9 h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary/20"
            disabled={createNote.isPending}
            autoFocus
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="note-content" className="text-sm font-medium">Content <span className="text-red-500">*</span></Label>
        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder="Write your note..."
          minHeight="180px"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Tags <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <TagInput tags={tags} onChange={setTags} />
      </div>

      {!isFreeTier ? (
        <>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="note-retention" className="text-sm font-medium">Retention Days <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="note-retention"
                type="number"
                min="1"
                value={retentionDays}
                onChange={(e) => setRetentionDays(e.target.value)}
                placeholder="e.g. 7"
                className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary/20"
                disabled={createNote.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note-max-downloads" className="text-sm font-medium">Max Views <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="note-max-downloads"
                type="number"
                min="1"
                value={maxDownloads}
                onChange={(e) => setMaxDownloads(e.target.value)}
                placeholder="Unlimited"
                className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary/20"
                disabled={createNote.isPending}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 py-1">
            <Switch
              id="protected-mode"
              checked={isProtected}
              onCheckedChange={setIsProtected}
              disabled={createNote.isPending}
            />
            <Label
              htmlFor="protected-mode"
              className="flex items-center gap-1.5 cursor-pointer text-sm font-medium"
            >
              {isProtected ? (
                <Lock className="h-4 w-4 text-amber-500" />
              ) : (
                <Unlock className="h-4 w-4 text-muted-foreground" />
              )}
              <span>Password Protected</span>
            </Label>
          </div>

          {isProtected && (
            <div className="space-y-1.5 animate-in slide-in-from-top-2">
              <Label htmlFor="note-password" className="text-sm font-medium">Password <span className="text-red-500">*</span></Label>
              <Input
                id="note-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a secure password..."
                className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary/20"
                disabled={createNote.isPending}
              />
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mt-2">
          <p className="text-sm font-medium text-primary mb-1">Unlock Premium Features</p>
          <p className="text-xs text-muted-foreground mb-2">
            Upgrade your plan to unlock Password Protection, Custom Expiry, and View Limits.
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Items will expire in 7 days on the Free tier.
          </p>
          <Button variant="default" size="sm" className="w-full" asChild>
            <Link href="/dashboard/settings/billing">Upgrade Plan</Link>
          </Button>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={createNote.isPending}
            className="rounded-xl px-5 h-10 shadow-sm"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={!title.trim() || content === "<p></p>" || content.replace(/<[^>]+>/g, "").trim() === "" || createNote.isPending}
          className="rounded-xl px-6 h-10 shadow-sm"
        >
          {createNote.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving Note...
            </>
          ) : (
            "Save Note"
          )}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Link as LinkIcon, Loader2, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/shared/tag-input";
import { Switch } from "@/components/ui/switch";
import { useCreateLink } from "@/hooks/use-items";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useSubscription } from "@/hooks/use-subscription";
import { toast } from "sonner";

type AddLinkFormProps = {
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function AddLinkForm({ onSuccess, onCancel }: AddLinkFormProps) {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const createLink = useCreateLink();
  const { data: subscription } = useSubscription();
  const isFreeTier = subscription?.plan === "Free";

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isProtected, setIsProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [retentionDays, setRetentionDays] = useState("");
  const [maxDownloads, setMaxDownloads] = useState("");

  function reset() {
    setUrl("");
    setTitle("");
    setNote("");
    setTags([]);
    setIsProtected(false);
    setPassword("");
    setRetentionDays("");
    setMaxDownloads("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || !activeWorkspaceId) return;
    if (isProtected && !password.trim()) {
      toast.error("Password is required for protected links");
      return;
    }

    try {
      await createLink.mutateAsync({
        workspaceId: activeWorkspaceId,
        content: url.trim(),
        title: title.trim() || undefined,
        note: note.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        password: isProtected ? password.trim() : undefined,
        retentionDays: retentionDays ? parseInt(retentionDays, 10) : undefined,
        maxDownloads: maxDownloads ? parseInt(maxDownloads, 10) : undefined,
      });
      toast.success("Link saved");
      reset();
      onSuccess?.();
    } catch {
      toast.error("Failed to save link");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="link-url" className="text-sm font-medium">URL <span className="text-red-500">*</span></Label>
        <div className="relative">
          <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="link-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="pl-9 h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary/20"
            disabled={createLink.isPending}
            autoFocus
          />
        </div>
      </div>
      
      <div className="space-y-1.5">
        <Label htmlFor="link-title" className="text-sm font-medium">Title <span className="text-muted-foreground font-normal">(auto-fetched if empty)</span></Label>
        <Input
          id="link-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Custom link title..."
          className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary/20"
          disabled={createLink.isPending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="link-note" className="text-sm font-medium">Note <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Textarea
          id="link-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add some context about this link..."
          rows={3}
          className="rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary/20 resize-none"
          disabled={createLink.isPending}
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
              <Label htmlFor="link-retention" className="text-sm font-medium">Retention Days <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="link-retention"
                type="number"
                min="1"
                value={retentionDays}
                onChange={(e) => setRetentionDays(e.target.value)}
                placeholder="e.g. 7"
                className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary/20"
                disabled={createLink.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="link-max-downloads" className="text-sm font-medium">Max Views <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="link-max-downloads"
                type="number"
                min="1"
                value={maxDownloads}
                onChange={(e) => setMaxDownloads(e.target.value)}
                placeholder="Unlimited"
                className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary/20"
                disabled={createLink.isPending}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 py-1">
            <Switch
              id="protected-mode-link"
              checked={isProtected}
              onCheckedChange={setIsProtected}
              disabled={createLink.isPending}
            />
            <Label
              htmlFor="protected-mode-link"
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
              <Label htmlFor="link-password" className="text-sm font-medium">Password <span className="text-red-500">*</span></Label>
              <Input
                id="link-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a secure password..."
                className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary/20"
                disabled={createLink.isPending}
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
            disabled={createLink.isPending}
            className="rounded-xl px-5 h-10 shadow-sm"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={!url.trim() || createLink.isPending}
          className="rounded-xl px-6 h-10 shadow-sm"
        >
          {createLink.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving Link...
            </>
          ) : (
            "Save Link"
          )}
        </Button>
      </div>
    </form>
  );
}

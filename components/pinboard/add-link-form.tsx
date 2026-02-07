"use client";

import { useState } from "react";
import { Link as LinkIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/shared/tag-input";
import { useCreateLink } from "@/hooks/use-items";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { toast } from "sonner";

type AddLinkFormProps = {
  onSuccess?: () => void;
};

export function AddLinkForm({ onSuccess }: AddLinkFormProps) {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const createLink = useCreateLink();

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);

  function reset() {
    setUrl("");
    setTitle("");
    setNote("");
    setTags([]);
    setExpanded(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || !activeWorkspaceId) return;

    try {
      await createLink.mutateAsync({
        workspaceId: activeWorkspaceId,
        content: url.trim(),
        title: title.trim() || undefined,
        note: note.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      toast.success("Link saved");
      reset();
      onSuccess?.();
    } catch {
      toast.error("Failed to save link");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Quick add bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a URL..."
            className="pl-9"
            onFocus={() => setExpanded(true)}
            disabled={createLink.isPending}
          />
        </div>
        <Button type="submit" disabled={!url.trim() || createLink.isPending}>
          {createLink.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Save"
          )}
        </Button>
      </div>

      {/* Expanded form */}
      {expanded && (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="link-title">Title (auto-fetched if empty)</Label>
            <Input
              id="link-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Link title"
              disabled={createLink.isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="link-note">Note (optional)</Label>
            <Textarea
              id="link-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note..."
              rows={2}
              disabled={createLink.isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tags</Label>
            <TagInput tags={tags} onChange={setTags} />
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(false)}
            >
              Collapse
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

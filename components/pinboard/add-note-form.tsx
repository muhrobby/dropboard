"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/shared/tag-input";
import { useCreateNote } from "@/hooks/use-items";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { toast } from "sonner";

type AddNoteFormProps = {
  onSuccess?: () => void;
};

export function AddNoteForm({ onSuccess }: AddNoteFormProps) {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const createNote = useCreateNote();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  function reset() {
    setTitle("");
    setContent("");
    setTags([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !activeWorkspaceId) return;

    try {
      await createNote.mutateAsync({
        workspaceId: activeWorkspaceId,
        title: title.trim(),
        content: content.trim(),
        tags: tags.length > 0 ? tags : undefined,
      });
      toast.success("Note saved");
      reset();
      onSuccess?.();
    } catch {
      toast.error("Failed to save note");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-4">
      <div className="space-y-1.5">
        <Label htmlFor="note-title">Title</Label>
        <Input
          id="note-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          disabled={createNote.isPending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="note-content">Content</Label>
        <Textarea
          id="note-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note..."
          rows={4}
          disabled={createNote.isPending}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Tags (optional)</Label>
        <TagInput tags={tags} onChange={setTags} />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={reset}
          disabled={createNote.isPending}
        >
          Clear
        </Button>
        <Button
          type="submit"
          disabled={!title.trim() || !content.trim() || createNote.isPending}
        >
          {createNote.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Note"
          )}
        </Button>
      </div>
    </form>
  );
}

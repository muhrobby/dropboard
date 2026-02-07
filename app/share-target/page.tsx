"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Share2, Link, StickyNote, Upload, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type ShareType = "link" | "note" | "drop";

function ShareTargetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending: sessionLoading } = useSession();
  const getActiveWorkspace = useWorkspaceStore((s) => s.getActiveWorkspace);

  const [shareType, setShareType] = useState<ShareType>("link");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parse shared data from URL params
  useEffect(() => {
    const sharedTitle = searchParams.get("title") || "";
    const sharedText = searchParams.get("text") || "";
    const sharedUrl = searchParams.get("url") || "";

    // Determine share type and populate fields
    if (sharedUrl) {
      setShareType("link");
      setTitle(sharedTitle || sharedUrl);
      setContent(sharedUrl);
      if (sharedText && sharedText !== sharedUrl) {
        setNote(sharedText);
      }
    } else if (sharedText) {
      // Check if text contains a URL
      const urlMatch = sharedText.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        setShareType("link");
        setContent(urlMatch[0]);
        setTitle(sharedTitle || urlMatch[0]);
        const remainingText = sharedText.replace(urlMatch[0], "").trim();
        if (remainingText) {
          setNote(remainingText);
        }
      } else {
        setShareType("note");
        setTitle(sharedTitle || "Shared Note");
        setContent(sharedText);
      }
    } else if (sharedTitle) {
      setShareType("note");
      setTitle(sharedTitle);
    }
  }, [searchParams]);

  // Handle file shares (from service worker POST)
  useEffect(() => {
    async function handleFileShare() {
      if (typeof window !== "undefined" && "launchQueue" in window) {
        // @ts-expect-error LaunchQueue is not in types yet
        window.launchQueue.setConsumer(async (launchParams: { files: FileSystemFileHandle[] }) => {
          if (launchParams.files && launchParams.files.length > 0) {
            const filePromises = launchParams.files.map(async (handle) => {
              return await handle.getFile();
            });
            const sharedFiles = await Promise.all(filePromises);
            setFiles(sharedFiles);
            setShareType("drop");
            if (sharedFiles.length === 1) {
              setTitle(sharedFiles[0].name);
            } else {
              setTitle(`${sharedFiles.length} files`);
            }
          }
        });
      }
    }

    handleFileShare();
  }, []);

  async function handleSubmit() {
    const workspace = getActiveWorkspace();
    if (!workspace) {
      toast.error("Please select a workspace first");
      return;
    }

    setIsSubmitting(true);

    try {
      if (shareType === "drop" && files.length > 0) {
        // Upload files
        for (const file of files) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("title", files.length === 1 ? title : file.name);
          if (note) formData.append("note", note);

          const response = await fetch(
            `/api/v1/files/upload?workspaceId=${workspace.id}`,
            {
              method: "POST",
              body: formData,
            }
          );

          if (!response.ok) {
            throw new Error("Failed to upload file");
          }
        }

        toast.success(
          files.length === 1 ? "File uploaded!" : `${files.length} files uploaded!`
        );
      } else if (shareType === "link") {
        // Create link
        const response = await fetch(`/api/v1/items?workspaceId=${workspace.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "link",
            title,
            content,
            note: note || undefined,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save link");
        }

        toast.success("Link saved!");
      } else if (shareType === "note") {
        // Create note
        const response = await fetch(`/api/v1/items?workspaceId=${workspace.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "note",
            title,
            content,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save note");
        }

        toast.success("Note saved!");
      }

      router.push("/dashboard/drops");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-12 w-12 rounded-full mx-auto" />
            <Skeleton className="h-6 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Share2 className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Sign In Required</h2>
            <p className="text-sm text-muted-foreground">
              Please sign in to save shared content to your Dropboard.
            </p>
            <Button onClick={() => router.push("/login?callbackUrl=/share-target")}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const workspace = getActiveWorkspace();
  if (!workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold">No Workspace</h2>
            <p className="text-sm text-muted-foreground">
              Please select a workspace to save content.
            </p>
            <Button onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
            <Share2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-center">Save to Dropboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Type Selector */}
          <div className="space-y-2">
            <Label>Save as</Label>
            <Select value={shareType} onValueChange={(v) => setShareType(v as ShareType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="link">
                  <div className="flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    Link
                  </div>
                </SelectItem>
                <SelectItem value="note">
                  <div className="flex items-center gap-2">
                    <StickyNote className="h-4 w-4" />
                    Note
                  </div>
                </SelectItem>
                {files.length > 0 && (
                  <SelectItem value="drop">
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      File ({files.length})
                    </div>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title..."
            />
          </div>

          {/* Content (for link/note) */}
          {shareType === "link" && (
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="https://..."
              />
            </div>
          )}

          {shareType === "note" && (
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Note content..."
                rows={5}
              />
            </div>
          )}

          {/* Note (optional for link/drop) */}
          {shareType !== "note" && (
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note..."
                rows={2}
              />
            </div>
          )}

          {/* File preview */}
          {shareType === "drop" && files.length > 0 && (
            <div className="space-y-2">
              <Label>Files</Label>
              <div className="p-3 bg-muted rounded-lg space-y-1">
                {files.map((file, i) => (
                  <p key={i} className="text-sm truncate">
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Workspace indicator */}
          <div className="text-xs text-muted-foreground">
            Saving to: <span className="font-medium">{workspace.name}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push("/dashboard")}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={isSubmitting || !title || (shareType === "link" && !content)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ShareTargetPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-12 w-12 rounded-full mx-auto" />
              <Skeleton className="h-6 w-48 mx-auto" />
              <Skeleton className="h-4 w-64 mx-auto" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <ShareTargetContent />
    </Suspense>
  );
}

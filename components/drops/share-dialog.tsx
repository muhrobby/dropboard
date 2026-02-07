"use client";

import { useState, useEffect } from "react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Check, Link, Loader2, Trash2, Globe } from "lucide-react";
import { toast } from "sonner";

interface ShareDialogProps {
  itemId: string;
  itemTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ExpiryOption = "1d" | "7d" | "30d" | "never";

export function ShareDialog({
  itemId,
  itemTitle,
  open,
  onOpenChange,
}: ShareDialogProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [expiryOption, setExpiryOption] = useState<ExpiryOption>("7d");
  const [isLoading, setIsLoading] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [copied, setCopied] = useState(false);
  const getActiveWorkspace = useWorkspaceStore((s) => s.getActiveWorkspace);

  // Check for existing share when dialog opens
  useEffect(() => {
    if (open) {
      checkExistingShare();
    }
  }, [open, itemId]);

  async function checkExistingShare() {
    const workspace = getActiveWorkspace();
    if (!workspace) return;

    try {
      const response = await fetch(
        `/api/v1/items/${itemId}/share?workspaceId=${workspace.id}`,
      );
      const result = await response.json();

      if (result.success && result.data) {
        setShareUrl(result.data.shareUrl);
        setShareId(result.data.id);
      } else {
        setShareUrl(null);
        setShareId(null);
      }
    } catch {
      // No existing share
    }
  }

  async function handleCreateShare() {
    const workspace = getActiveWorkspace();
    if (!workspace) return;

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/v1/items/${itemId}/share?workspaceId=${workspace.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expiryOption }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to create share link");
      }

      setShareUrl(result.data.shareUrl);
      setShareId(result.data.id);
      toast.success("Share link created!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create share link",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRevokeShare() {
    const workspace = getActiveWorkspace();
    if (!workspace) return;

    setIsRevoking(true);

    try {
      const response = await fetch(
        `/api/v1/items/${itemId}/share?workspaceId=${workspace.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error("Failed to revoke share link");
      }

      setShareUrl(null);
      setShareId(null);
      toast.success("Share link revoked");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to revoke share link",
      );
    } finally {
      setIsRevoking(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    setShareUrl(null);
    setShareId(null);
    setExpiryOption("7d");
    setCopied(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Share "{itemTitle}"
          </DialogTitle>
        </DialogHeader>

        {!shareUrl ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Create a public link that anyone can use to view this item.
            </p>

            <div className="space-y-2">
              <Label>Link expires in</Label>
              <Select
                value={expiryOption}
                onValueChange={(v) => setExpiryOption(v as ExpiryOption)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">1 day</SelectItem>
                  <SelectItem value="7d">7 days</SelectItem>
                  <SelectItem value="30d">30 days</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <Link className="h-4 w-4 text-green-600" />
              <p className="text-sm text-green-700 dark:text-green-300">
                Anyone with this link can view this item
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Share Link
              </Label>
              <div className="flex items-center gap-2">
                <Input value={shareUrl} readOnly className="text-xs" />
                <Button size="icon" variant="outline" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleRevokeShare}
              disabled={isRevoking}
              className="w-full"
            >
              {isRevoking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revoking...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Revoke Share Link
                </>
              )}
            </Button>
          </div>
        )}

        <DialogFooter>
          {!shareUrl ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateShare} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Link className="mr-2 h-4 w-4" />
                    Create Link
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

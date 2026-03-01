"use client";

import { useState, useEffect } from "react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Check,
  Link,
  Loader2,
  Trash2,
  Globe,
  Lock,
  BarChart2,
  Eye,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  useShare,
  useCreateShare,
  useUpdateShare,
  useRevokeShare,
  useShareAnalytics,
} from "@/hooks/use-share";
import type { ShareResponse, ShareAnalyticsResponse } from "@/types/api";

type ExpiryOption = "1d" | "7d" | "30d" | "never";

type ShareDialogProps = {
  itemId: string;
  itemTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// ── Link Settings tab ─────────────────────────────────────────────────────────
function LinkSettingsTab({
  itemId,
  share,
}: {
  itemId: string;
  share: ShareResponse | null | undefined;
}) {
  const { activeWorkspaceId } = useWorkspaceStore();
  const createShare = useCreateShare();
  const updateShare = useUpdateShare();
  const revokeShare = useRevokeShare();

  const [expiryOption, setExpiryOption] = useState<ExpiryOption>("7d");
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  async function handleCreate() {
    if (!activeWorkspaceId) return;
    createShare.mutate(
      { itemId, workspaceId: activeWorkspaceId, expiryOption },
      {
        onSuccess: () => toast.success("Share link created"),
        onError: (err) => toast.error(err.message),
      },
    );
  }

  async function handleCopy() {
    if (!share?.shareUrl) return;
    await navigator.clipboard.writeText(share.shareUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleRevoke() {
    if (!activeWorkspaceId) return;
    revokeShare.mutate(
      { itemId, workspaceId: activeWorkspaceId },
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

  function handleUpdateExpiry(val: ExpiryOption) {
    if (!activeWorkspaceId || !share) return;
    updateShare.mutate(
      { itemId, workspaceId: activeWorkspaceId, expiryOption: val },
      {
        onSuccess: () => toast.success("Expiry updated"),
        onError: (err) => toast.error(err.message),
      },
    );
  }

  if (!share) {
    return (
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
        <Button
          className="w-full"
          onClick={handleCreate}
          disabled={createShare.isPending}
        >
          {createShare.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Link className="mr-2 h-4 w-4" />
              Create Share Link
            </>
          )}
        </Button>
      </div>
    );
  }

  const expiresLabel = share.expiresAt
    ? new Date(share.expiresAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Never";

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
        <Globe className="h-4 w-4 text-green-600 shrink-0" />
        <p className="text-sm text-green-700 dark:text-green-300 flex-1">
          Anyone with this link can view this item
        </p>
        {share.isPasswordProtected && (
          <Badge variant="secondary" className="text-xs gap-1">
            <Lock className="h-3 w-3" />
            Protected
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Share Link</Label>
        <div className="flex items-center gap-2">
          <Input value={share.shareUrl} readOnly className="text-xs" />
          <Button size="icon" variant="outline" onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5" />
          <span>{share.accessCount} views</span>
          {share.maxViews && (
            <span className="text-xs">/ {share.maxViews} max</span>
          )}
        </div>
        <div className="text-right text-xs">Expires: {expiresLabel}</div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Change expiry</Label>
        <Select
          defaultValue="7d"
          onValueChange={(v) => handleUpdateExpiry(v as ExpiryOption)}
          disabled={updateShare.isPending}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select new expiry…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1d">1 day from now</SelectItem>
            <SelectItem value="7d">7 days from now</SelectItem>
            <SelectItem value="30d">30 days from now</SelectItem>
            <SelectItem value="never">Never</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="destructive"
        size="sm"
        className="w-full"
        onClick={() => setConfirmRevoke(true)}
        disabled={revokeShare.isPending}
      >
        {revokeShare.isPending ? (
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

      <ConfirmDialog
        open={confirmRevoke}
        onOpenChange={setConfirmRevoke}
        title="Revoke share link?"
        description="Anyone with this link will no longer be able to access the item. This cannot be undone."
        confirmLabel="Revoke"
        onConfirm={handleRevoke}
        variant="destructive"
      />
    </div>
  );
}

// ── Security tab ──────────────────────────────────────────────────────────────
function SecurityTab({
  itemId,
  share,
}: {
  itemId: string;
  share: ShareResponse | null | undefined;
}) {
  const { activeWorkspaceId } = useWorkspaceStore();
  const updateShare = useUpdateShare();

  const [password, setPassword] = useState("");
  const [maxViews, setMaxViews] = useState<string>(
    share?.maxViews?.toString() ?? "",
  );
  const [burnAfterReading, setBurnAfterReading] = useState<boolean>(
    share?.burnAfterReading ?? false,
  );

  // Keep local state in sync when share loads
  useEffect(() => {
    setMaxViews(share?.maxViews?.toString() ?? "");
    setBurnAfterReading(share?.burnAfterReading ?? false);
  }, [share?.maxViews, share?.burnAfterReading]);

  if (!share) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Create a share link first to configure security settings.
      </p>
    );
  }

  function handleSave() {
    if (!activeWorkspaceId) return;
    const parsedMax = maxViews.trim() === "" ? null : parseInt(maxViews, 10);
    updateShare.mutate(
      {
        itemId,
        workspaceId: activeWorkspaceId,
        password: password.trim() || undefined,
        maxViews: Number.isNaN(parsedMax as number) ? null : parsedMax,
        burnAfterReading,
      },
      {
        onSuccess: () => {
          toast.success("Security settings saved");
          setPassword("");
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function handleRemovePassword() {
    if (!activeWorkspaceId) return;
    updateShare.mutate(
      { itemId, workspaceId: activeWorkspaceId, password: null },
      {
        onSuccess: () => toast.success("Password removed"),
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <div className="space-y-5 py-2">
      {/* Password */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5" />
          Password protection
        </Label>
        <div className="flex items-center gap-2">
          <Input
            type="password"
            placeholder={
              share.isPasswordProtected ? "Enter new password to change…" : "Set a password…"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {share.isPasswordProtected && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRemovePassword}
              disabled={updateShare.isPending}
              className="shrink-0 text-xs text-destructive hover:text-destructive"
            >
              Remove
            </Button>
          )}
        </div>
        {share.isPasswordProtected && (
          <p className="text-xs text-muted-foreground">
            This link is currently password-protected.
          </p>
        )}
      </div>

      {/* Max views */}
      <div className="space-y-2">
        <Label>Max views</Label>
        <Input
          type="number"
          min={1}
          placeholder="Unlimited"
          value={maxViews}
          onChange={(e) => setMaxViews(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Leave blank for unlimited. Link becomes inactive after this many views.
        </p>
      </div>

      {/* Burn after reading */}
      <div className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
        <div className="space-y-0.5">
          <Label className="text-sm">Burn after reading</Label>
          <p className="text-xs text-muted-foreground">
            Automatically delete this link after the first view.
          </p>
        </div>
        <Switch
          checked={burnAfterReading}
          onCheckedChange={setBurnAfterReading}
        />
      </div>

      <Button
        className="w-full"
        onClick={handleSave}
        disabled={updateShare.isPending}
      >
        {updateShare.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Save Security Settings"
        )}
      </Button>
    </div>
  );
}

// ── Analytics tab ─────────────────────────────────────────────────────────────
function AnalyticsTab({
  itemId,
  share,
}: {
  itemId: string;
  share: ShareResponse | null | undefined;
}) {
  const { data: analytics, isLoading, refetch, isFetching } =
    useShareAnalytics(share ? itemId : null);

  if (!share) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Create a share link first to see analytics.
      </p>
    );
  }

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Last 30 days</p>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : analytics ? (
        <AnalyticsSummary analytics={analytics} />
      ) : null}
    </div>
  );
}

function AnalyticsSummary({ analytics }: { analytics: ShareAnalyticsResponse }) {
  const maxCount = Math.max(...analytics.dailyCounts.map((d) => d.count), 1);

  return (
    <div className="space-y-4">
      {/* Summary numbers */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 text-center">
          <p className="text-2xl font-semibold tabular-nums">{analytics.totalViews}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total views</p>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 text-center">
          <p className="text-2xl font-semibold tabular-nums">{analytics.last30Days}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Last 30 days</p>
        </div>
      </div>

      {/* Micro bar chart */}
      {analytics.dailyCounts.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Daily views</p>
          <div className="flex items-end gap-0.5 h-16">
            {analytics.dailyCounts.map((d) => (
              <div
                key={d.date}
                title={`${d.date}: ${d.count}`}
                className="flex-1 bg-primary/70 rounded-sm min-h-[2px]"
                style={{ height: `${Math.max(2, (d.count / maxCount) * 100)}%` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent entries */}
      {analytics.recentEntries.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Recent visits</p>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {analytics.recentEntries.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-1 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <Eye className="h-3 w-3 shrink-0" />
                <span className="flex-1 truncate">
                  {e.userAgent
                    ? e.userAgent.split(" ").slice(0, 3).join(" ")
                    : "Unknown browser"}
                </span>
                <span className="shrink-0">
                  {new Date(e.accessedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {analytics.recentEntries.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No visits recorded yet.
        </p>
      )}
    </div>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────
export function ShareDialog({
  itemId,
  itemTitle,
  open,
  onOpenChange,
}: ShareDialogProps) {
  const { activeWorkspaceId } = useWorkspaceStore();
  const { data: share, isLoading } = useShare(open ? itemId : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Share &quot;{itemTitle}&quot;
          </DialogTitle>
        </DialogHeader>

        {!activeWorkspaceId ? null : isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="link" className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-9 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
              <TabsTrigger
                value="link"
                className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm"
              >
                <Link className="h-3.5 w-3.5" />
                Link
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm"
              >
                <Lock className="h-3.5 w-3.5" />
                Security
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm"
              >
                <BarChart2 className="h-3.5 w-3.5" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="link" className="mt-3">
              <LinkSettingsTab itemId={itemId} share={share} />
            </TabsContent>

            <TabsContent value="security" className="mt-3">
              <SecurityTab itemId={itemId} share={share} />
            </TabsContent>

            <TabsContent value="analytics" className="mt-3">
              <AnalyticsTab itemId={itemId} share={share} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

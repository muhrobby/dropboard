"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useWorkspaces } from "@/hooks/use-workspace";
import { useMembers } from "@/hooks/use-members";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Settings,
  HardDrive,
  Users,
  Trash2,
  Webhook,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/patterns";
import { useSubscription } from "@/hooks/use-subscription";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function SettingsPage() {
  const router = useRouter();
  const workspace = useWorkspaceStore((s) => s.getActiveWorkspace());
  const { refetch: refetchWorkspaces } = useWorkspaces();
  const { data: members } = useMembers();
  const { data: subscription } = useSubscription();
  
  const [name, setName] = useState(workspace?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const storageUsed = workspace?.storageUsedBytes ?? 0;
  // Use dynamic limit from subscription or default to 2GB if not loaded yet
  const storageLimit = subscription?.usage.storageLimit ?? 2 * 1024 * 1024 * 1024;
  
  const storagePercent = Math.min(
    100,
    Math.round((storageUsed / storageLimit) * 100),
  );

  async function handleSave() {
    if (!workspace || !name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/workspaces/${workspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || "Failed to update");
      }
      await refetchWorkspaces();
      toast.success("Workspace updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!workspace) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/workspaces/${workspace.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || "Failed to delete");
      }
      await refetchWorkspaces();
      toast.success("Workspace deleted");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  if (!workspace) {
    return (
      <div className="flex flex-col h-full relative">
        <header className="shrink-0 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 sticky top-0 z-20">
          <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/50 p-4 sm:p-6 md:p-8">
          <div className="max-w-3xl mx-auto space-y-6">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const isOwner = workspace.role === "owner";
  const isAdmin = workspace.role === "admin";
  const isTeam = workspace.type === "team";

  return (
    <div className="flex flex-col h-full relative">
      <header className="shrink-0 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 sticky top-0 z-20">
        <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
          <PageHeader title="Settings" description="Manage workspace preferences" />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/50 p-4 sm:p-6 md:p-8 pb-24 md:pb-8">
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
          {/* General */}
          <Card className="rounded-2xl border-zinc-200/50 dark:border-zinc-800/50 shadow-sm bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/20 px-6 py-5">
              <CardTitle className="flex items-center gap-2.5 text-lg font-medium">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Settings className="h-4 w-4" />
                </div>
                General
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <Label htmlFor="ws-name" className="text-sm font-medium text-foreground">Workspace Name</Label>
                <div className="flex gap-3">
                  <Input
                    id="ws-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isOwner}
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                    className="max-w-md h-10 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary/20 focus-visible:border-primary/50 transition-all shadow-sm"
                  />
                  {isOwner && (
                    <Button
                      onClick={handleSave}
                      disabled={saving || !name.trim() || name === workspace.name}
                      className="rounded-xl h-10 px-5 shadow-sm"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Only workspace owners can rename the workspace.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Storage */}
          <Card className="rounded-2xl border-zinc-200/50 dark:border-zinc-800/50 shadow-sm bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/20 px-6 py-5">
              <CardTitle className="flex items-center gap-2.5 text-lg font-medium">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <HardDrive className="h-4 w-4" />
                </div>
                Storage
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-2xl font-bold tracking-tight">
                    {formatBytes(storageUsed)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    used of {formatBytes(storageLimit)} total
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {storagePercent}%
                  </p>
                  <p className="text-xs text-muted-foreground">utilized</p>
                </div>
              </div>
              
              <div className="h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
                    storagePercent > 90
                      ? "bg-red-500"
                      : storagePercent > 70
                        ? "bg-yellow-500"
                        : "bg-primary"
                  }`}
                  style={{ width: `${Math.max(2, storagePercent)}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 w-full animate-shimmer" style={{ backgroundImage: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)" }} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Integrations - Webhooks */}
          {(isOwner || isAdmin) && (
            <Card
              className="rounded-2xl border-zinc-200/50 dark:border-zinc-800/50 shadow-sm bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm group cursor-pointer hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
              onClick={() => router.push("/dashboard/settings/webhooks")}
            >
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform duration-300">
                      <Webhook className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-foreground group-hover:text-primary transition-colors">Webhooks</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Connect to n8n, Zapier, or your own services
                      </p>
                    </div>
                  </div>
                  <div className="size-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Team Info */}
          {isTeam && (
            <Card className="rounded-2xl border-zinc-200/50 dark:border-zinc-800/50 shadow-sm bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/20 px-6 py-5">
                <CardTitle className="flex items-center gap-2.5 text-lg font-medium">
                  <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <Users className="h-4 w-4" />
                  </div>
                  Team
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-medium text-foreground">
                      {members?.length ?? 0} Active Member{(members?.length ?? 0) !== 1 ? "s" : ""}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Manage team access and roles
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/dashboard/team")}
                    className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900 shadow-sm"
                  >
                    Manage Team
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Danger Zone */}
          {isTeam && isOwner && (
            <Card className="rounded-2xl border-red-500/30 dark:border-red-500/20 shadow-sm bg-red-50/30 dark:bg-red-950/10 backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 px-6 py-5">
                <CardTitle className="flex items-center gap-2.5 text-lg font-medium text-red-600 dark:text-red-500">
                  <div className="p-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </div>
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-foreground">Delete Workspace</h4>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Permanently delete this workspace and all its data. This action cannot be undone.
                    </p>
                  </div>
                  <ConfirmDialog
                    title="Delete Workspace"
                    description={`Are you sure you want to delete "${workspace.name}"? All items, files, and member data will be permanently removed.`}
                    confirmLabel="Delete Workspace"
                    variant="destructive"
                    onConfirm={handleDelete}
                    isPending={deleting}
                  >
                    <Button variant="destructive" className="rounded-xl shadow-sm shrink-0">
                      Delete Workspace
                    </Button>
                  </ConfirmDialog>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

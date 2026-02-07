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
import { Settings, HardDrive, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FREE_STORAGE_LIMIT_BYTES } from "@/lib/constants";

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
  const [name, setName] = useState(workspace?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const storageUsed = workspace?.storageUsedBytes ?? 0;
  const storagePercent = Math.min(
    100,
    Math.round((storageUsed / FREE_STORAGE_LIMIT_BYTES) * 100)
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
      router.push("/drops");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  if (!workspace) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const isOwner = workspace.role === "owner";
  const isTeam = workspace.type === "team";

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 pb-20 md:pb-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage workspace preferences
        </p>
      </div>

      {/* General */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            General
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ws-name">Workspace Name</Label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isOwner}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
          {isOwner && (
            <Button
              onClick={handleSave}
              disabled={saving || !name.trim() || name === workspace.name}
              size="sm"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Storage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HardDrive className="h-5 w-5" />
            Storage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>{formatBytes(storageUsed)} used</span>
            <span className="text-muted-foreground">
              {formatBytes(FREE_STORAGE_LIMIT_BYTES)} total
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                storagePercent > 90
                  ? "bg-red-500"
                  : storagePercent > 70
                    ? "bg-yellow-500"
                    : "bg-primary"
              }`}
              style={{ width: `${storagePercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {storagePercent}% of storage used
          </p>
        </CardContent>
      </Card>

      {/* Team Info */}
      {isTeam && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {members?.length ?? 0} member{(members?.length ?? 0) !== 1 ? "s" : ""}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/team")}
              >
                Manage Team
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      {isTeam && isOwner && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-destructive">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Permanently delete this workspace and all its data. This action
              cannot be undone.
            </p>
            <ConfirmDialog
              title="Delete Workspace"
              description={`Are you sure you want to delete "${workspace.name}"? All items, files, and member data will be permanently removed.`}
              confirmLabel="Delete Workspace"
              variant="destructive"
              onConfirm={handleDelete}
              isPending={deleting}
            >
              <Button variant="destructive" size="sm">
                Delete Workspace
              </Button>
            </ConfirmDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Webhook,
  Plus,
  MoreVertical,
  Trash2,
  Play,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const WEBHOOK_EVENTS = [
  { id: "item.created", label: "Item Created", description: "When a new drop, link, or note is created" },
  { id: "item.deleted", label: "Item Deleted", description: "When an item is deleted" },
  { id: "item.pinned", label: "Item Pinned", description: "When an item is pinned" },
  { id: "item.unpinned", label: "Item Unpinned", description: "When an item is unpinned" },
  { id: "item.shared", label: "Item Shared", description: "When a share link is created" },
  { id: "member.joined", label: "Member Joined", description: "When a new member joins the workspace" },
  { id: "member.removed", label: "Member Removed", description: "When a member is removed" },
  { id: "workspace.updated", label: "Workspace Updated", description: "When workspace settings change" },
] as const;

type WebhookType = {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  lastTriggeredAt: string | null;
  failureCount: string;
  createdAt: string;
};

export function WebhooksSettings() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookType | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();
  const getActiveWorkspace = useWorkspaceStore((s) => s.getActiveWorkspace);
  const workspace = getActiveWorkspace();

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ["webhooks", workspace?.id],
    queryFn: async () => {
      if (!workspace) return [];
      const res = await fetch(`/api/v1/webhooks?workspaceId=${workspace.id}`);
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!workspace,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; url: string; events: string[] }) => {
      const res = await fetch(`/api/v1/webhooks?workspaceId=${workspace?.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create webhook");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook created");
      resetForm();
      setShowCreateDialog(false);
    },
    onError: () => toast.error("Failed to create webhook"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WebhookType> }) => {
      const res = await fetch(`/api/v1/webhooks/${id}?workspaceId=${workspace?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update webhook");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook updated");
      resetForm();
      setEditingWebhook(null);
    },
    onError: () => toast.error("Failed to update webhook"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/webhooks/${id}?workspaceId=${workspace?.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete webhook");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook deleted");
    },
    onError: () => toast.error("Failed to delete webhook"),
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/webhooks/${id}/test?workspaceId=${workspace?.id}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.data?.success) {
        throw new Error(data.data?.status || "Test failed");
      }
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Test successful (${data.data.duration}ms)`);
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
    onError: (err) => toast.error(`Test failed: ${err.message}`),
  });

  function resetForm() {
    setName("");
    setUrl("");
    setSelectedEvents([]);
  }

  function handleEdit(webhook: WebhookType) {
    setEditingWebhook(webhook);
    setName(webhook.name);
    setUrl(webhook.url);
    setSelectedEvents(webhook.events || []);
  }

  function handleSubmit() {
    if (!name || !url || selectedEvents.length === 0) {
      toast.error("Please fill all required fields");
      return;
    }

    if (editingWebhook) {
      updateMutation.mutate({
        id: editingWebhook.id,
        data: { name, url, events: selectedEvents },
      });
    } else {
      createMutation.mutate({ name, url, events: selectedEvents });
    }
  }

  function toggleEvent(eventId: string) {
    setSelectedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((e) => e !== eventId)
        : [...prev, eventId]
    );
  }

  if (!workspace) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Webhooks</h2>
          <p className="text-sm text-muted-foreground">
            Send events to external services when things happen in your workspace.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Webhook
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : webhooks?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Webhook className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium">No webhooks configured</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Create a webhook to integrate with n8n, Zapier, or your own services.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {webhooks?.map((webhook: WebhookType) => (
            <Card key={webhook.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{webhook.name}</h3>
                      {webhook.isActive ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                      {parseInt(webhook.failureCount || "0") > 0 && (
                        <Badge variant="destructive">
                          {webhook.failureCount} failures
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 font-mono">
                      {webhook.url}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {webhook.events?.map((event) => (
                        <Badge key={event} variant="secondary" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                    {webhook.lastTriggeredAt && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last triggered: {new Date(webhook.lastTriggeredAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => testMutation.mutate(webhook.id)}
                        disabled={testMutation.isPending}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Test Webhook
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(webhook)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          updateMutation.mutate({
                            id: webhook.id,
                            data: { isActive: !webhook.isActive },
                          });
                        }}
                      >
                        {webhook.isActive ? "Disable" : "Enable"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteMutation.mutate(webhook.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={showCreateDialog || !!editingWebhook}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingWebhook(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingWebhook ? "Edit Webhook" : "Create Webhook"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Webhook"
              />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <div className="grid gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {WEBHOOK_EVENTS.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-2 cursor-pointer"
                    onClick={() => toggleEvent(event.id)}
                  >
                    <Checkbox
                      checked={selectedEvents.includes(event.id)}
                      onCheckedChange={() => toggleEvent(event.id)}
                    />
                    <div>
                      <p className="text-sm font-medium">{event.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setEditingWebhook(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingWebhook ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

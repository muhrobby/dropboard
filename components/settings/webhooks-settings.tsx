"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useSubscription } from "@/hooks/use-subscription";
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
  const { data: subscription } = useSubscription();

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

  const maxWebhooks = subscription?.tierLimits?.maxWebhooks || 0;
  const isFreeTier = subscription?.plan === "Free";
  const webhooksCount = webhooks?.length || 0;
  const canAddWebhook = maxWebhooks === -1 || webhooksCount < maxWebhooks;

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
          <h2 className="text-xl font-semibold text-foreground tracking-tight">Configured Webhooks</h2>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            Send events to external services when things happen in your workspace.
            {!isFreeTier && maxWebhooks > 0 && (
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-xs font-medium">
                {webhooksCount} / {maxWebhooks === -1 ? 'Unlimited' : maxWebhooks}
              </span>
            )}
          </p>
        </div>
        {isFreeTier ? (
          <Button 
            disabled
            className="rounded-full shadow-sm px-5 h-10 opacity-50 cursor-not-allowed"
            title="Upgrade to unlock webhooks"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Webhook
          </Button>
        ) : (
          <Button 
            onClick={() => setShowCreateDialog(true)}
            disabled={!canAddWebhook}
            className="rounded-full shadow-sm px-5 h-10"
            title={!canAddWebhook ? "Webhook limit reached" : ""}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Webhook
          </Button>
        )}
      </div>

      {isFreeTier && (
        <Card className="rounded-2xl border-primary/20 bg-primary/5 shadow-sm overflow-hidden mb-6">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-primary mb-1">Webhooks are a Premium Feature</h3>
              <p className="text-xs text-muted-foreground">
                Upgrade your plan to automate your workflow with n8n, Zapier, or custom APIs.
              </p>
            </div>
            <Button variant="default" className="rounded-full shrink-0" asChild>
              <Link href="/dashboard/settings/billing">Upgrade Plan</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="rounded-2xl border-zinc-200/50 dark:border-zinc-800/50 shadow-sm bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <Skeleton className="h-6 w-48 mb-3" />
                <Skeleton className="h-4 w-64" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : webhooks?.length === 0 ? (
        <Card className="rounded-2xl border-zinc-200/50 dark:border-zinc-800/50 shadow-sm bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-12 flex flex-col items-center text-center">
            <div className="size-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center mb-5 shadow-sm">
              <Webhook className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No webhooks configured</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Create a webhook to integrate with n8n, Zapier, or your own custom services.
            </p>
            {!isFreeTier && (
              <Button 
                variant="outline" 
                onClick={() => setShowCreateDialog(true)}
                className="mt-6 rounded-full border-zinc-200 dark:border-zinc-800 shadow-sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create First Webhook
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {webhooks?.map((webhook: WebhookType) => (
            <Card key={webhook.id} className="rounded-2xl border-zinc-200/50 dark:border-zinc-800/50 shadow-sm bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm group hover:border-primary/20 transition-all duration-300">
              <CardContent className="p-0">
                <div className="flex items-start justify-between p-6">
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg text-foreground truncate">{webhook.name}</h3>
                      {webhook.isActive ? (
                        <Badge variant="outline" className="text-green-600 dark:text-green-400 border-green-600/30 bg-green-500/10 rounded-full px-2.5 font-medium">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="rounded-full px-2.5 font-medium">Inactive</Badge>
                      )}
                      {parseInt(webhook.failureCount || "0") > 0 && (
                        <Badge variant="destructive" className="rounded-full px-2.5 font-medium">
                          {webhook.failureCount} failures
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-zinc-100/50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-lg w-max mb-4">
                      <Webhook className="h-3.5 w-3.5" />
                      <span className="font-mono text-xs">{webhook.url}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {webhook.events?.map((event) => (
                        <Badge key={event} variant="secondary" className="text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md font-normal text-muted-foreground shadow-sm">
                          {event}
                        </Badge>
                      ))}
                    </div>
                    
                    {webhook.lastTriggeredAt ? (
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-zinc-400" />
                        Last triggered: <span className="text-foreground">{new Date(webhook.lastTriggeredAt).toLocaleString()}</span>
                      </p>
                    ) : (
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-zinc-400" />
                        Never triggered
                      </p>
                    )}
                  </div>
                  
                  <div className="shrink-0 flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => testMutation.mutate(webhook.id)}
                      disabled={testMutation.isPending}
                      className="hidden sm:flex rounded-xl h-9 text-xs font-medium border-zinc-200 dark:border-zinc-800 bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900 shadow-sm"
                    >
                      {testMutation.isPending ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Play className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Test
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 bg-transparent hover:bg-white dark:hover:bg-zinc-950 shadow-none hover:shadow-sm transition-all">
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-zinc-200 dark:border-zinc-800 p-1.5">
                        <DropdownMenuItem
                          onClick={() => testMutation.mutate(webhook.id)}
                          disabled={testMutation.isPending}
                          className="sm:hidden rounded-lg cursor-pointer"
                        >
                          <Play className="mr-2 h-4 w-4 text-muted-foreground" />
                          Test Webhook
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(webhook)} className="rounded-lg cursor-pointer">
                          Edit Webhook
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            updateMutation.mutate({
                              id: webhook.id,
                              data: { isActive: !webhook.isActive },
                            });
                          }}
                          className="rounded-lg cursor-pointer"
                        >
                          {webhook.isActive ? "Disable Webhook" : "Enable Webhook"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteMutation.mutate(webhook.id)}
                          className="text-red-600 dark:text-red-500 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-500/10 dark:focus:text-red-500 rounded-lg cursor-pointer mt-1"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Webhook
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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
        <DialogContent className="max-w-lg rounded-[24px] p-0 overflow-hidden border-zinc-200/60 dark:border-zinc-800/60 shadow-2xl">
          <DialogHeader className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/20">
            <DialogTitle className="text-lg font-semibold">
              {editingWebhook ? "Edit Webhook" : "Create Webhook"}
            </DialogTitle>
            <CardDescription>
              Configure an endpoint to receive workspace events.
            </CardDescription>
          </DialogHeader>
          <div className="space-y-6 p-6 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2.5">
              <Label className="text-sm font-medium">Webhook Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production Slack Alerts"
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-2.5">
              <Label className="text-sm font-medium">Endpoint URL</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-domain.com/webhook"
                className="h-10 rounded-xl font-mono text-sm"
              />
            </div>
            <div className="space-y-2.5">
              <Label className="text-sm font-medium">Events to send</Label>
              <div className="grid gap-2 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 bg-zinc-50/30 dark:bg-zinc-900/30">
                {WEBHOOK_EVENTS.map((event) => (
                  <label
                    key={event.id}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white dark:hover:bg-zinc-950 cursor-pointer transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 hover:shadow-sm"
                  >
                    <Checkbox
                      checked={selectedEvents.includes(event.id)}
                      onCheckedChange={() => toggleEvent(event.id)}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium leading-none text-foreground">{event.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-5 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/20">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setEditingWebhook(null);
                resetForm();
              }}
              className="rounded-full px-5 h-10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="rounded-full px-6 h-10"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingWebhook ? "Save Changes" : "Create Webhook"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useActivity } from "@/hooks/use-members";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Activity,
  Upload,
  Trash2,
  Pin,
  PinOff,
  Mail,
  UserPlus,
  UserMinus,
  ShieldCheck,
  MailX,
} from "lucide-react";
import type { ActivityAction } from "@/types";

const actionConfig: Record<
  ActivityAction,
  { icon: React.ElementType; label: string; color: string }
> = {
  ITEM_CREATED: { icon: Upload, label: "created an item", color: "text-green-600" },
  ITEM_DELETED: { icon: Trash2, label: "deleted an item", color: "text-red-600" },
  ITEM_PINNED: { icon: Pin, label: "pinned an item", color: "text-blue-600" },
  ITEM_UNPINNED: { icon: PinOff, label: "unpinned an item", color: "text-orange-600" },
  INVITE_SENT: { icon: Mail, label: "sent an invite", color: "text-purple-600" },
  INVITE_ACCEPTED: { icon: UserPlus, label: "accepted an invite", color: "text-green-600" },
  INVITE_CANCELLED: { icon: MailX, label: "cancelled an invite", color: "text-gray-600" },
  MEMBER_ROLE_CHANGED: { icon: ShieldCheck, label: "changed a member's role", color: "text-blue-600" },
  MEMBER_REMOVED: { icon: UserMinus, label: "removed a member", color: "text-red-600" },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getMetadataLabel(action: ActivityAction, metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  if (metadata.title) return `"${metadata.title}"`;
  if (metadata.targetIdentifier) return String(metadata.targetIdentifier);
  if (metadata.newRole) return `to ${metadata.newRole}`;
  return null;
}

export default function ActivityPage() {
  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useActivity();

  const allLogs = data?.pages.flatMap((p) => p.logs) ?? [];

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Activity</h1>
        <p className="text-sm text-muted-foreground">
          Recent actions in this workspace
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : allLogs.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Activity className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No activity yet. Actions like uploads, pins, and team changes will appear here.
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-4">
                {allLogs.map((log) => {
                  const config = actionConfig[log.action as ActivityAction] ?? {
                    icon: Activity,
                    label: log.action,
                    color: "text-muted-foreground",
                  };
                  const Icon = config.icon;
                  const detail = getMetadataLabel(
                    log.action as ActivityAction,
                    log.metadata
                  );

                  return (
                    <div key={log.id} className="relative flex gap-3 pl-1">
                      {/* Timeline dot */}
                      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>

                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-sm">
                          <span className="font-medium">
                            {log.actor?.name ?? "Unknown"}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            {config.label}
                          </span>
                          {detail && (
                            <span className="text-muted-foreground">
                              {" "}
                              {detail}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {timeAgo(log.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasNextPage && (
                <div className="mt-6 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? "Loading..." : "Load More"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

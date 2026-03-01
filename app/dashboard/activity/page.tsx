"use client";

import { useMemo } from "react";
import { useActivity } from "@/hooks/use-members";
import { PageHeader } from "@/components/patterns";
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
  Zap,
  Users,
  FolderOpen,
  Share2,
  Link2Off,
  GitBranch,
  RotateCcw,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  SHARE_CREATED: { icon: Share2, label: "shared an item", color: "text-cyan-600" },
  SHARE_REVOKED: { icon: Link2Off, label: "revoked a share link", color: "text-gray-600" },
  ITEM_VERSION_UPLOADED: { icon: GitBranch, label: "uploaded a new version", color: "text-indigo-600" },
  ITEM_REVERTED: { icon: RotateCcw, label: "reverted to a previous version", color: "text-orange-600" },
  ITEM_COMMENT_ADDED: { icon: MessageSquare, label: "commented on an item", color: "text-blue-600" },
  ITEM_COMMENT_DELETED: { icon: MessageSquare, label: "deleted a comment", color: "text-gray-600" },
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

function StatCard({
  icon,
  label,
  value,
  subtext,
  color,
  bgColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
  bgColor: string;
}) {
  const Icon = icon;
  return (
    <Card className="relative overflow-hidden group border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 hover:border-primary/30">
      <div className="flex items-start gap-4 relative z-10">
        <div className={cn("flex items-center justify-center size-12 rounded-2xl transition-transform duration-300 group-hover:scale-110 shadow-sm", bgColor)}>
          <Icon className={cn("size-6", color)} />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight text-foreground tabular-nums leading-none">{value}</p>
          {subtext && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{subtext}</p>
          )}
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-primary/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </Card>
  );
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

  // Calculate statistics
  const stats = useMemo(() => {
    const totalActions = allLogs.length;
    const uploads = allLogs.filter((log) => log.action === "ITEM_CREATED").length;
    const deletes = allLogs.filter((log) => log.action === "ITEM_DELETED").length;
    const pins = allLogs.filter((log) => log.action === "ITEM_PINNED").length;
    const unpins = allLogs.filter((log) => log.action === "ITEM_UNPINNED").length;
    const invitesSent = allLogs.filter((log) => log.action === "INVITE_SENT").length;
    const invitesAccepted = allLogs.filter((log) => log.action === "INVITE_ACCEPTED").length;

    // Count unique actors
    const uniqueActors = new Set(allLogs.map((log) => log.actor?.name)).size;

    return {
      totalActions,
      uploads,
      deletes,
      pins,
      unpins,
      invitesSent,
      invitesAccepted,
      uniqueActors,
    };
  }, [allLogs]);

  return (
    <div className="flex flex-col h-full relative">
      <header className="shrink-0 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 sticky top-0 z-20">
        <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
          <PageHeader
            title="Activity"
            description="Recent actions in this workspace"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/50 p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-24 md:pb-8">
        {/* Stat Cards */}
        {!isLoading && allLogs.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in slide-in-from-bottom-2">
            <StatCard
              icon={Zap}
              label="Total Actions"
              value={stats.totalActions}
              subtext="All activity"
              color="text-blue-500"
              bgColor="bg-blue-500/10"
            />
            <StatCard
              icon={Upload}
              label="Items Created"
              value={stats.uploads}
              subtext="New items added"
              color="text-green-500"
              bgColor="bg-green-500/10"
            />
            <StatCard
              icon={Pin}
              label="Items Pinned"
              value={stats.pins}
              subtext={`${stats.unpins} unpinned`}
              color="text-purple-500"
              bgColor="bg-purple-500/10"
            />
            <StatCard
              icon={Users}
              label="Active Members"
              value={stats.uniqueActors}
              subtext="Participating"
              color="text-orange-500"
              bgColor="bg-orange-500/10"
            />
          </div>
        )}

        <Card className="rounded-2xl border-zinc-200/50 dark:border-zinc-800/50 shadow-sm bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/20 px-6 py-5">
            <CardTitle className="flex items-center gap-2.5 text-lg font-medium">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Activity className="h-4 w-4" />
              </div>
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <Skeleton className="h-4 w-3/4 max-w-[300px]" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : allLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="size-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                  <Activity className="h-8 w-8 text-zinc-400" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">No activity yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Actions like uploads, pins, and team changes will appear here.
                </p>
              </div>
            ) : (
              <div className="relative p-6 sm:p-8">
                {/* Timeline line */}
                <div className="absolute left-[2.4rem] sm:left-[3.4rem] top-8 bottom-8 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

                <div className="space-y-8">
                  {allLogs.map((log, index) => {
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
                    const isLast = index === allLogs.length - 1;

                    return (
                      <div key={log.id} className="relative flex gap-4 sm:gap-6 group">
                        {/* Mobile line (hidden on desktop to align with dots properly if we wanted, but let's keep it simple) */}
                        {!isLast && <div className="absolute left-[1.15rem] top-10 bottom-[-2rem] w-px bg-zinc-200 dark:bg-zinc-800 sm:hidden" />}

                        {/* Timeline dot */}
                        <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm transition-transform duration-300 group-hover:scale-110">
                          <Icon className={cn("h-4 w-4", config.color)} />
                        </div>

                        <div className="flex-1 min-w-0 pt-1.5 pb-2">
                          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-4">
                            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                              <span className="font-semibold text-foreground mr-1">
                                {log.actor?.name ?? "Unknown"}
                              </span>
                              {config.label}
                              {detail && (
                                <span className="font-medium text-foreground ml-1">
                                  {detail}
                                </span>
                              )}
                            </p>
                            <time className="text-xs font-medium text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                              {timeAgo(log.createdAt)}
                            </time>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {hasNextPage && (
                  <div className="mt-10 flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="rounded-full px-6"
                    >
                      {isFetchingNextPage ? "Loading more..." : "Load More Activity"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import {
  ImageDown,
  Bookmark,
  Search,
  Users,
  Activity,
  Settings,
  ArrowRight,
  HardDrive,
  FolderOpen,
  TrendingUp,
} from "lucide-react";
import { useWorkspaces } from "@/hooks/use-workspace";
import { useMembers } from "@/hooks/use-members";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  PageHeader,
  MetricCard,
  OverviewLayout,
  OverviewMetrics,
  OverviewContent,
  OverviewMain,
  OverviewSide,
  SectionHeader,
} from "@/components/patterns";
import { useSubscription } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const quickLinks = [
  {
    title: "Upload Files",
    description: "Drag and drop files to quickly upload",
    href: "/dashboard/drops",
    icon: ImageDown,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
  },
  {
    title: "Pinboard",
    description: "View your pinned items",
    href: "/dashboard/pinboard",
    icon: Bookmark,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    title: "Search",
    description: "Find anything across your workspace",
    href: "/dashboard/search",
    icon: Search,
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
  },
  {
    title: "Team",
    description: "Manage team members and invites",
    href: "/dashboard/team",
    icon: Users,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    title: "Activity",
    description: "See recent activity in your workspace",
    href: "/dashboard/activity",
    icon: Activity,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    title: "Settings",
    description: "Manage workspace settings",
    href: "/dashboard/settings",
    icon: Settings,
    color: "text-slate-500",
    bgColor: "bg-slate-500/10",
  },
];

export default function DashboardPage() {
  const workspace = useWorkspaceStore((s) => s.getActiveWorkspace());
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const { data: members } = useMembers();
  const { data: subscription } = useSubscription();

  const storageUsed = workspace?.storageUsedBytes ?? 0;
  
  // Use dynamic limit from subscription or default to 2GB if not loaded yet
  const storageLimit = subscription?.usage.storageLimit ?? 2 * 1024 * 1024 * 1024;
  
  const storagePercent = Math.min(
    100,
    Math.round((storageUsed / storageLimit) * 100),
  );

  const planName = subscription?.plan ?? "Free";

  if (workspacesLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-8">
        <div className="flex justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <OverviewLayout>
        {/* Page Header */}
        <PageHeader
          title="Dashboard"
          description="Welcome back! Here's what's happening with your workspace."
        >
          <Button asChild>
            <Link href="/dashboard/drops">
              <ImageDown className="h-4 w-4 mr-2" />
              Upload Files
            </Link>
          </Button>
        </PageHeader>

        {/* Metrics Grid */}
        <OverviewMetrics>
          <MetricCard
            label="Storage Used"
            value={formatBytes(storageUsed)}
            change={`${storagePercent}% used`}
            trend={storagePercent > 80 ? "down" : "neutral"}
            icon={<HardDrive className="h-4 w-4" />}
          />
          <MetricCard
            label="Workspaces"
            value={workspaces?.length ?? 0}
            change="Active"
            trend="neutral"
            icon={<FolderOpen className="h-4 w-4" />}
          />
          <MetricCard
            label="Team Members"
            value={members?.length ?? 0}
            change={workspace?.type === "personal" ? "Personal" : "Team"}
            trend="neutral"
            icon={<Users className="h-4 w-4" />}
          />
          <MetricCard
            label="Storage Limit"
            value={formatBytes(storageLimit)}
            change={`${planName} tier`}
            trend="up"
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </OverviewMetrics>

        {/* Two Column Content */}
        <OverviewContent>
          {/* Main – Storage Progress */}
          <OverviewMain>
            <Card className="h-full border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold tracking-tight">Storage Overview</h2>
                    <div className="p-2 bg-primary/5 text-primary rounded-xl">
                      <HardDrive className="size-5" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Monitor your workspace storage usage</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between text-sm">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground tracking-tight">Space Used</p>
                    <p className="text-muted-foreground">{storagePercent}% of total capacity</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-semibold text-foreground tracking-tight tabular-nums">
                      {formatBytes(storageUsed)}
                    </p>
                    <p className="text-muted-foreground tabular-nums">
                      of {formatBytes(storageLimit)}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Progress 
                    value={storagePercent} 
                    className="h-3 rounded-full bg-zinc-100 dark:bg-zinc-800" 
                    indicatorClassName={cn(
                      storagePercent > 90 ? "bg-rose-500" : storagePercent > 70 ? "bg-amber-500" : "bg-primary"
                    )}
                  />
                </div>
                
                <div className="pt-2 flex items-start gap-3 text-sm">
                  <div className={cn(
                    "mt-0.5 p-1 rounded-full",
                    storagePercent > 90 ? "bg-rose-500/10 text-rose-600" : storagePercent > 70 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"
                  )}>
                    {storagePercent > 90 ? <Activity className="size-3.5" /> : storagePercent > 70 ? <Activity className="size-3.5" /> : <Activity className="size-3.5" />}
                  </div>
                  <p className="text-muted-foreground leading-relaxed flex-1">
                    {storagePercent > 90
                      ? "⚠️ You are critically close to your storage limit. Please upgrade your plan or remove old files."
                      : storagePercent > 70
                        ? "You're starting to use a significant portion of your storage. Keep an eye on it."
                        : "You have plenty of space available. Keep uploading and collaborating!"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </OverviewMain>

          {/* Side – Workspace Info */}
          <OverviewSide>
            <Card className="h-full border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/5 text-primary rounded-xl">
                    <FolderOpen className="size-5" />
                  </div>
                  <CardTitle className="text-lg">Workspace Details</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-sm text-muted-foreground">Name</span>
                    <span className="font-semibold text-foreground tracking-tight">{workspace?.name ?? "—"}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <span className="font-medium text-xs uppercase tracking-widest px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-foreground">
                      {workspace?.type ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-sm text-muted-foreground">Members</span>
                    <span className="font-semibold text-foreground tracking-tight tabular-nums">
                      {members?.length ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">Current Plan</span>
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-semibold text-foreground tracking-tight">{planName}</span>
                    </div>
                  </div>
                </div>
                
                <Button className="w-full" variant="outline" asChild>
                  <Link href="/dashboard/settings">
                    Manage Workspace
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </OverviewSide>
        </OverviewContent>

        {/* Quick Actions Grid */}
        <div className="mt-12">
          <SectionHeader
            title="Quick Actions"
            description="Jump right back into your workflow"
            className="mb-6"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30 border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4 relative z-10">
                      <div
                        className={cn(
                          "p-3 rounded-xl transition-transform duration-300 group-hover:scale-110",
                          link.bgColor
                        )}
                      >
                        <link.icon className={cn("size-5", link.color)} />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="font-semibold text-[15px] tracking-tight text-foreground group-hover:text-primary transition-colors">
                          {link.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed pr-6">
                          {link.description}
                        </p>
                      </div>
                      <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 size-4 text-primary opacity-0 -translate-x-4 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300" />
                    </div>
                  </CardContent>
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-primary/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </OverviewLayout>
    </div>
  );
}

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
            <Card>
              <CardHeader>
                <SectionHeader
                  title="Storage Overview"
                  description="Your current storage usage"
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Used</span>
                  <span className="font-medium tabular-nums">
                    {formatBytes(storageUsed)} /{" "}
                    {formatBytes(storageLimit)}
                  </span>
                </div>
                <Progress value={storagePercent} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {storagePercent > 90
                    ? "⚠️ Almost full – consider upgrading or cleaning up files"
                    : storagePercent > 70
                      ? "Getting close to limit"
                      : "Plenty of space available"}
                </p>
              </CardContent>
            </Card>
          </OverviewMain>

          {/* Side – Workspace Info */}
          <OverviewSide>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Workspace Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{workspace?.name ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium capitalize">
                    {workspace?.type ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Members</span>
                  <span className="font-medium tabular-nums">
                    {members?.length ?? 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          </OverviewSide>
        </OverviewContent>

        {/* Quick Actions Grid */}
        <div>
          <SectionHeader title="Quick Actions" className="mb-4" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Card className="group transition-all hover:shadow-md hover:border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-2.5 rounded-lg ${link.bgColor}`}>
                        <link.icon className={`h-5 w-5 ${link.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{link.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {link.description}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </OverviewLayout>
    </div>
  );
}

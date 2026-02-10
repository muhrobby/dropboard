"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspaces } from "@/hooks/use-workspace";
import { useMembers } from "@/hooks/use-members";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useSubscription } from "@/hooks/use-subscription";
import {
  ImageDown,
  Bookmark,
  Search,
  Users,
  Activity,
  Settings,
  FolderKanban,
  HardDrive,
  TrendingUp,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

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
    description: "Quick upload your files",
    href: "/v2/drops",
    icon: ImageDown,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
  },
  {
    title: "Pinboard",
    description: "View your pinned items",
    href: "/v2/pinboard",
    icon: Bookmark,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    title: "Search",
    description: "Search across all workspaces",
    href: "/v2/search",
    icon: Search,
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
  },
  {
    title: "Team",
    description: "Manage team members",
    href: "/v2/team",
    icon: Users,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    title: "Activity",
    description: "See recent activity",
    href: "/v2/activity",
    icon: Activity,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    title: "Settings",
    description: "Manage workspace settings",
    href: "/v2/settings",
    icon: Settings,
    color: "text-slate-500",
    bgColor: "bg-slate-500/10",
  },
];

export default function V2DashboardPage() {
  const workspace = useWorkspaceStore((s) => s.getActiveWorkspace());
  const { data: workspaces, isLoading: isWorkspacesLoading } = useWorkspaces();
  const { data: members } = useMembers();
  const { data: subscription } = useSubscription();

  const storageUsed = workspace?.storageUsedBytes ?? 0;
  const storageLimit = subscription?.usage.storageLimit ?? 2 * 1024 * 1024 * 1024;
  const storagePercent = Math.min(
    100,
    Math.round((storageUsed / storageLimit) * 100),
  );
  const planName = subscription?.plan ?? "Free";

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome back to your workspace
        </p>
      </div>

      {/* Stats Grid - Modern Card Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Storage Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <HardDrive className="h-5 w-5 text-primary" />
              <CardTitle>Storage</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Used</p>
                <p className="text-2xl font-bold">{formatBytes(storageUsed)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {storagePercent}% of
                </p>
                <p className="text-lg font-bold">{formatBytes(storageLimit)}</p>
              </div>
            </div>
            <div
              className={`h-2 rounded-full ${
                storagePercent > 90
                  ? "bg-red-500"
                  : storagePercent > 75
                    ? "bg-orange-500"
                    : storagePercent > 50
                      ? "bg-yellow-500"
                      : "bg-green-500"
              }`}
            ></div>
          </CardContent>
        </Card>

        {/* Workspaces Card */}
        <Card>
          <CardHeader>
            <CardTitle>Workspaces</CardTitle>
          </CardHeader>
          <CardContent>
            {isWorkspacesLoading ? (
              <div className="grid grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {workspaces && workspaces.length > 0 ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}
                    </span>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/v2/settings">
                        + New Workspace
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <UploadCloud className="h-12 w-12 text-muted-foreground" />
                      <div>
                        <p className="text-lg font-medium">No workspaces yet</p>
                        <p className="text-sm text-muted-foreground">
                          Create your first workspace to get started
                        </p>
                        <Button size="lg" asChild>
                          <Link href="/v2/settings">
                            Create Workspace
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Members Card */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            {isWorkspacesLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <div className="space-y-4">
                {members && members.length > 0 ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {members.length} member{members.length !== 1 ? "s" : ""}
                    </span>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/v2/team">
                        + Invite
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="flex flex-col items-center gap-4">
                      <Users className="h-12 w-12 text-muted-foreground" />
                      <div>
                        <p className="text-lg font-medium">No team members yet</p>
                        <p className="text-sm text-muted-foreground">
                          Invite team members to collaborate
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

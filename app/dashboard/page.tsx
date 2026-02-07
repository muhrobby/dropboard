"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ImageDown,
  Bookmark,
  Search,
  Users,
  Activity,
  Settings,
  ArrowRight,
} from "lucide-react";
import { useWorkspaces } from "@/hooks/use-workspace";
import { useMembers } from "@/hooks/use-members";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FREE_STORAGE_LIMIT_BYTES } from "@/lib/constants";
import { Progress } from "@/components/ui/progress";

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
    color: "text-blue-500",
  },
  {
    title: "Pinboard",
    description: "View your pinned items",
    href: "/dashboard/pinboard",
    icon: Bookmark,
    color: "text-yellow-500",
  },
  {
    title: "Search",
    description: "Find anything across your workspace",
    href: "/dashboard/search",
    icon: Search,
    color: "text-purple-500",
  },
  {
    title: "Team",
    description: "Manage team members and invites",
    href: "/dashboard/team",
    icon: Users,
    color: "text-green-500",
  },
  {
    title: "Activity",
    description: "See recent activity in your workspace",
    href: "/dashboard/activity",
    icon: Activity,
    color: "text-orange-500",
  },
  {
    title: "Settings",
    description: "Manage workspace settings",
    href: "/dashboard/settings",
    icon: Settings,
    color: "text-gray-500",
  },
];

export default function DashboardPage() {
  const workspace = useWorkspaceStore((s) => s.getActiveWorkspace());
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const { data: members } = useMembers();

  const storageUsed = workspace?.storageUsedBytes ?? 0;
  const storagePercent = Math.min(
    100,
    Math.round((storageUsed / FREE_STORAGE_LIMIT_BYTES) * 100)
  );

  if (workspacesLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back! Here&apos;s what&apos;s happening with your workspace.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Storage Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(storageUsed)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              of {formatBytes(FREE_STORAGE_LIMIT_BYTES)} total
            </p>
            <Progress value={storagePercent} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Workspaces
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workspaces?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active workspace
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {workspace?.type === "personal" ? "Personal workspace" : "Team workspace"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Storage Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{storagePercent}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {storagePercent > 90 ? "Almost full" : storagePercent > 70 ? "Getting full" : "Plenty of space"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="transition-colors hover:bg-accent">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{link.title}</CardTitle>
                    <link.icon className={`h-5 w-5 ${link.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {link.description}
                  </p>
                  <div className="flex items-center text-sm text-primary mt-2">
                    <span>Go to page</span>
                    <ArrowRight className="ml-1 h-4 w-4" />
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

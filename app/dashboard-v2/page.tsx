"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StorageWidget } from "@/components/dashboard/v2/storage-widget";
import { RecentUploads } from "@/components/dashboard/v2/recent-uploads";
import { ActivityFeed } from "@/components/dashboard/v2/activity-feed";

export default function DashboardPageV2() {
  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Overview
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Here&apos;s what&apos;s happening in your workspace today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild>
            <Link href="/dashboard-v2/drops">
              <Plus className="mr-2 h-4 w-4" /> New Upload
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Storage Widget takes the first slot but maybe taller or distinct */}
        <StorageWidget />

        {/* Quick Stats Cards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground mt-1">
              2 pending invites
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3,450</div>
            <p className="text-xs text-muted-foreground mt-1">+120 this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bandwidth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45 GB</div>
            <p className="text-xs text-muted-foreground mt-1">
              +2.5% vs last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Content Area */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-7">
        {/* Recent Uploads Table (Wider) */}
        <div className="col-span-4">
          <RecentUploads />
        </div>

        {/* Activity Feed (Narrower) */}
        <div className="col-span-3">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}

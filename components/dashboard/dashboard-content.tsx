"use client";

import { useMemo } from "react";
import {
  Files,
  FolderOpen,
  Link as LinkIcon,
  StickyNote,
  Users,
  HardDrive,
  Clock,
  TrendingUp,
  Image as ImageIcon,
  FileText,
  Archive,
  Calendar,
  Activity,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useItems } from "@/hooks/use-items";
import { useMembers } from "@/hooks/use-members";
import { formatBytes } from "@/components/drops/drops-page-utils";

// Format tanggal untuk trend chart
function getTrendLabels(): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    labels.push(date.toLocaleDateString("en-US", { weekday: "short" }));
  }
  return labels;
}

function getDaysRemaining(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

type StatCardProps = {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
};

function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  color,
  bgColor,
  trend,
  loading = false,
}: StatCardProps) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              {trend && (
                <div
                  className={cn(
                    "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                    trend.isPositive
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : "bg-red-500/10 text-red-600 dark:text-red-400"
                  )}
                >
                  <TrendingUp className="w-3 h-3" />
                  {trend.value}%
                </div>
              )}
            </div>
            {loading ? (
              <Skeleton className="h-9 w-24 mb-2" />
            ) : (
              <p className="text-3xl font-bold tracking-tight">{value}</p>
            )}
            {subtext && (
              <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
            )}
          </div>
          <div
            className={cn(
              "flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 group-hover:scale-110",
              bgColor
            )}
          >
            <Icon className={cn("w-7 h-7", color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FileTypeBar({
  label,
  count,
  total,
  color,
  icon: Icon,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  icon: React.ElementType;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4", color)} />
          <span className="font-medium">{label}</span>
        </div>
        <span className="text-muted-foreground">
          {count} ({percentage.toFixed(0)}%)
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}

function TrendChart({
  data,
  labels,
}: {
  data: number[];
  labels: string[];
}) {
  const maxValue = Math.max(...data, 1);

  return (
    <div className="flex items-end justify-between gap-1 h-24">
      {data.map((value, index) => {
        const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
        const isToday = index === data.length - 1;

        return (
          <div key={index} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full relative group/trend">
              <div
                className={cn(
                  "w-full rounded-t-lg transition-all duration-500 hover:opacity-80 cursor-pointer relative",
                  isToday ? "bg-primary" : "bg-primary/40"
                )}
                style={{ height: `${Math.max(height, 4)}%` }}
              >
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/trend:opacity-100 transition-opacity">
                  <span className="text-xs font-bold text-white drop-shadow-md">
                    {value}
                  </span>
                </div>
              </div>
            </div>
            <span
              className={cn(
                "text-xs font-medium",
                isToday ? "text-primary" : "text-muted-foreground"
              )}
            >
              {labels[index]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardContent() {
  // Fetch data from various sources
  const { data: dropsData, isLoading: dropsLoading } = useItems({ type: "drop" });
  const { data: linksData, isLoading: linksLoading } = useItems({ type: "link" });
  const { data: notesData, isLoading: notesLoading } = useItems({ type: "note" });
  const { data: membersData, isLoading: membersLoading } = useMembers();

  const drops = dropsData?.data ?? [];
  const links = linksData?.data ?? [];
  const notes = notesData?.data ?? [];
  const members = membersData ?? [];
  const invites: never[] = [];

  // Calculate statistics
  const stats = useMemo(() => {
    const totalFiles = drops.length;
    const totalSize = drops.reduce(
      (sum, item) => sum + (item.fileAsset?.sizeBytes || 0),
      0
    );
    const totalLinks = links.length;
    const totalNotes = notes.length;

    const pinnedCount = drops.filter((item) => item.isPinned).length;

    // Expiring files
    let expiringToday = 0;
    let expiringThisWeek = 0;

    drops.forEach((item) => {
      if (item.isPinned) return;
      const daysRemaining = getDaysRemaining(item.expiresAt);
      if (daysRemaining !== null) {
        if (daysRemaining <= 1) expiringToday++;
        if (daysRemaining <= 7) expiringThisWeek++;
      }
    });

    const memberCount = members.length;
    const pendingInvites = 0;

    // File types
    const fileTypes = {
      images: drops.filter(
        (item) => item.fileAsset?.mimeType?.startsWith("image/")
      ).length,
      documents: drops.filter((item) => {
        const mime = item.fileAsset?.mimeType || "";
        return (
          mime.includes("pdf") ||
          mime.includes("word") ||
          mime.includes("document") ||
          mime.includes("sheet") ||
          mime.includes("presentation") ||
          mime.startsWith("text/")
        );
      }).length,
      archives: drops.filter((item) => {
        const mime = item.fileAsset?.mimeType || "";
        return mime.includes("zip") || mime.includes("archive") || mime.includes("compressed");
      }).length,
      other: 0,
    };
    fileTypes.other = totalFiles - fileTypes.images - fileTypes.documents - fileTypes.archives;

    return {
      totalFiles,
      totalSize,
      totalLinks,
      totalNotes,
      pinnedCount,
      expiringToday,
      expiringThisWeek,
      memberCount,
      pendingInvites,
      fileTypes,
    };
  }, [drops, links, notes, members, invites]);

  // Calculate activity trend (last 7 days)
  const activityTrend = useMemo(() => {
    const trend: number[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      // Count items created on this day
      const count = [
        ...drops.filter((item) => {
          const created = new Date(item.createdAt);
          return created >= date && created < nextDate;
        }),
        ...links.filter((item) => {
          const created = new Date(item.createdAt);
          return created >= date && created < nextDate;
        }),
        ...notes.filter((item) => {
          const created = new Date(item.createdAt);
          return created >= date && created < nextDate;
        }),
      ].length;

      trend.push(count);
    }

    return trend;
  }, [drops, links, notes]);

  const trendLabels = getTrendLabels();
  const isLoading = dropsLoading || linksLoading || notesLoading || membersLoading;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your workspace activity and statistics
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Calendar className="w-4 h-4" />
          Last 7 days
        </Button>
      </div>

      {/* Main Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Files"
          value={stats.totalFiles}
          subtext={`${stats.fileTypes.images} images, ${stats.fileTypes.documents} docs`}
          icon={Files}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
          loading={isLoading}
        />
        <StatCard
          title="Storage Used"
          value={formatBytes(stats.totalSize)}
          subtext={`${stats.pinnedCount} pinned files`}
          icon={HardDrive}
          color="text-purple-500"
          bgColor="bg-purple-500/10"
          loading={isLoading}
        />
        <StatCard
          title="Team Members"
          value={stats.memberCount}
          subtext={`${stats.pendingInvites} pending invites`}
          icon={Users}
          color="text-green-500"
          bgColor="bg-green-500/10"
          loading={isLoading}
        />
        <StatCard
          title="Expiring Soon"
          value={stats.expiringThisWeek}
          subtext={stats.expiringToday > 0 ? `${stats.expiringToday} today!` : "Next 7 days"}
          icon={Clock}
          color="text-orange-500"
          bgColor="bg-orange-500/10"
          loading={isLoading}
        />
      </div>

      {/* Content Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Drops"
          value={stats.totalFiles}
          subtext="Uploaded files"
          icon={FolderOpen}
          color="text-cyan-500"
          bgColor="bg-cyan-500/10"
          loading={isLoading}
        />
        <StatCard
          title="Links"
          value={stats.totalLinks}
          subtext="Saved links"
          icon={LinkIcon}
          color="text-pink-500"
          bgColor="bg-pink-500/10"
          loading={isLoading}
        />
        <StatCard
          title="Notes"
          value={stats.totalNotes}
          subtext="Quick notes"
          icon={StickyNote}
          color="text-yellow-500"
          bgColor="bg-yellow-500/10"
          loading={isLoading}
        />
        <StatCard
          title="Total Items"
          value={stats.totalFiles + stats.totalLinks + stats.totalNotes}
          subtext="Across all types"
          icon={BarChart3}
          color="text-indigo-500"
          bgColor="bg-indigo-500/10"
          loading={isLoading}
        />
      </div>

      {/* Activity Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Activity Trend (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <TrendChart data={activityTrend} labels={trendLabels} />
          )}
        </CardContent>
      </Card>

      {/* File Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Files className="w-5 h-5" />
            File Type Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <FileTypeBar
                label="Images"
                count={stats.fileTypes.images}
                total={stats.totalFiles}
                color="text-purple-500"
                icon={ImageIcon}
              />
              <FileTypeBar
                label="Documents"
                count={stats.fileTypes.documents}
                total={stats.totalFiles}
                color="text-blue-500"
                icon={FileText}
              />
              <FileTypeBar
                label="Archives"
                count={stats.fileTypes.archives}
                total={stats.totalFiles}
                color="text-orange-500"
                icon={Archive}
              />
              {stats.fileTypes.other > 0 && (
                <FileTypeBar
                  label="Other"
                  count={stats.fileTypes.other}
                  total={stats.totalFiles}
                  color="text-gray-500"
                  icon={Files}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Storage Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Storage Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-500" />
                  <span className="text-sm font-medium">Drops</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatBytes(stats.totalSize)}
                </span>
              </div>
              <Progress
                value={100}
                className="h-3"
              />
              <p className="text-xs text-muted-foreground text-center">
                Total storage used across all items
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert for Expiring Files */}
      {stats.expiringToday > 0 && !isLoading && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500/20">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                  {stats.expiringToday} file{stats.expiringToday > 1 ? "s" : ""} expiring today!
                </p>
                <p className="text-xs text-muted-foreground">
                  These files will be automatically deleted. Pin them to keep permanently.
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="/drops">View Files</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

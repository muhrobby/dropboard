"use client";

import { useQuery } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/stores/workspace-store";

type DashboardStats = {
  totalFiles: number;
  totalSize: number;
  totalLinks: number;
  totalNotes: number;
  pinnedCount: number;
  expiringToday: number;
  expiringThisWeek: number;
  memberCount: number;
  pendingInvites: number;
  recentActivity: number;
  fileTypes: {
    images: number;
    documents: number;
    archives: number;
    other: number;
  };
  storageBreakdown: {
    drops: number;
    pinboard: number;
    other: number;
  };
  activityTrend: {
    date: string;
    uploads: number;
    pins: number;
  }[];
};

async function fetchDashboardStats(
  workspaceId: string
): Promise<DashboardStats> {
  const res = await fetch(`/api/v1/dashboard?workspaceId=${workspaceId}`);
  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error?.message || "Failed to fetch dashboard stats");
  }

  return json.data;
}

export function useDashboardStats() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  return useQuery({
    queryKey: ["dashboard", activeWorkspaceId],
    queryFn: () => fetchDashboardStats(activeWorkspaceId!),
    enabled: !!activeWorkspaceId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { ApiResponse, ShareResponse, ShareAnalyticsResponse } from "@/types/api";

// ----- Fetch functions -----

async function fetchShare(
  itemId: string,
  workspaceId: string,
): Promise<ShareResponse | null> {
  const res = await fetch(
    `/api/v1/items/${itemId}/share?workspaceId=${workspaceId}`,
  );
  const json: ApiResponse<ShareResponse | null> = await res.json();
  if (!json.success) {
    throw new Error("error" in json ? json.error.message : "Failed to fetch share");
  }
  return json.data;
}

async function createShare(data: {
  itemId: string;
  workspaceId: string;
  expiryOption?: string;
  password?: string;
  maxViews?: number | null;
  burnAfterReading?: boolean;
}): Promise<ShareResponse> {
  const res = await fetch(
    `/api/v1/items/${data.itemId}/share?workspaceId=${data.workspaceId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expiryOption: data.expiryOption ?? "7d",
        password: data.password,
        maxViews: data.maxViews,
        burnAfterReading: data.burnAfterReading,
      }),
    },
  );
  const json: ApiResponse<ShareResponse> = await res.json();
  if (!json.success) {
    throw new Error("error" in json ? json.error.message : "Failed to create share");
  }
  return json.data;
}

async function updateShare(data: {
  itemId: string;
  workspaceId: string;
  password?: string | null;
  maxViews?: number | null;
  burnAfterReading?: boolean;
  expiryOption?: string;
}): Promise<ShareResponse> {
  const res = await fetch(
    `/api/v1/items/${data.itemId}/share?workspaceId=${data.workspaceId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: data.password,
        maxViews: data.maxViews,
        burnAfterReading: data.burnAfterReading,
        expiryOption: data.expiryOption,
      }),
    },
  );
  const json: ApiResponse<ShareResponse> = await res.json();
  if (!json.success) {
    throw new Error("error" in json ? json.error.message : "Failed to update share");
  }
  return json.data;
}

async function revokeShare(data: {
  itemId: string;
  workspaceId: string;
}): Promise<void> {
  const res = await fetch(
    `/api/v1/items/${data.itemId}/share?workspaceId=${data.workspaceId}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { error?: { message?: string } }).error?.message ?? "Failed to revoke share");
  }
}

async function fetchShareAnalytics(
  itemId: string,
  workspaceId: string,
): Promise<ShareAnalyticsResponse> {
  const res = await fetch(
    `/api/v1/items/${itemId}/share/analytics?workspaceId=${workspaceId}`,
  );
  const json: ApiResponse<ShareAnalyticsResponse> = await res.json();
  if (!json.success) {
    throw new Error("error" in json ? json.error.message : "Failed to fetch analytics");
  }
  return json.data;
}

// ----- Hooks -----

export function useShare(itemId: string | null) {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  return useQuery({
    queryKey: ["share", itemId, activeWorkspaceId],
    queryFn: () => fetchShare(itemId!, activeWorkspaceId!),
    enabled: !!itemId && !!activeWorkspaceId,
  });
}

export function useCreateShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createShare,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["share", variables.itemId] });
    },
  });
}

export function useUpdateShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateShare,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["share", variables.itemId] });
    },
  });
}

export function useRevokeShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeShare,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["share", variables.itemId] });
      queryClient.invalidateQueries({ queryKey: ["share-analytics", variables.itemId] });
    },
  });
}

export function useShareAnalytics(itemId: string | null) {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  return useQuery({
    queryKey: ["share-analytics", itemId, activeWorkspaceId],
    queryFn: () => fetchShareAnalytics(itemId!, activeWorkspaceId!),
    enabled: !!itemId && !!activeWorkspaceId,
  });
}

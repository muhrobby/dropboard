"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { ApiResponse, ItemResponse, PaginationMeta } from "@/types/api";

type TrashParams = {
  page?: number;
  limit?: number;
};

type PaginatedTrashItems = {
  data: ItemResponse[];
  meta: PaginationMeta;
};

async function fetchTrashItems(
  workspaceId: string,
  params: TrashParams,
): Promise<PaginatedTrashItems> {
  const searchParams = new URLSearchParams();
  searchParams.set("workspaceId", workspaceId);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  const res = await fetch(`/api/v1/trash?${searchParams.toString()}`);
  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error?.message || "Failed to fetch trash items");
  }

  return { data: json.data, meta: json.meta };
}

async function restoreItem(id: string): Promise<ItemResponse> {
  const res = await fetch(`/api/v1/trash/${id}`, { method: "POST" });
  const json: ApiResponse<ItemResponse> = await res.json();
  if (!json.success) {
    throw new Error(
      "error" in json ? json.error.message : "Failed to restore item",
    );
  }
  return json.data;
}

async function permanentDeleteItem(id: string): Promise<void> {
  const res = await fetch(`/api/v1/trash/${id}`, { method: "DELETE" });
  const json: ApiResponse<{ deleted: boolean }> = await res.json();
  if (!json.success) {
    throw new Error(
      "error" in json ? json.error.message : "Failed to delete item",
    );
  }
}

export function useTrashItems(params?: TrashParams) {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  return useQuery({
    queryKey: ["trash", activeWorkspaceId, params],
    queryFn: () =>
      fetchTrashItems(activeWorkspaceId!, {
        page: params?.page || 1,
        limit: params?.limit || 20,
      }),
    enabled: !!activeWorkspaceId,
  });
}

export function useRestoreItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: restoreItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function usePermanentDeleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: permanentDeleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
    },
  });
}

// Batch operations
type BatchResult = {
  deleted?: number;
  restored?: number;
  total: number;
  permanent?: boolean;
};

async function batchRestoreItems(ids: string[]): Promise<BatchResult> {
  const res = await fetch("/api/v1/trash/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  const json: ApiResponse<BatchResult> = await res.json();
  if (!json.success) {
    throw new Error(
      "error" in json ? json.error.message : "Failed to restore items",
    );
  }
  return json.data;
}

async function batchPermanentDeleteItems(ids: string[]): Promise<BatchResult> {
  const res = await fetch("/api/v1/trash/batch", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  const json: ApiResponse<BatchResult> = await res.json();
  if (!json.success) {
    throw new Error(
      "error" in json ? json.error.message : "Failed to delete items",
    );
  }
  return json.data;
}

export function useBatchRestoreItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: batchRestoreItems,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useBatchPermanentDeleteItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: batchPermanentDeleteItems,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
    },
  });
}

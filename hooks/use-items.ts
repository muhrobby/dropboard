"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type {
  ApiResponse,
  ApiSuccessResponse,
  ItemResponse,
  PaginationMeta,
} from "@/types/api";
import type { ItemType } from "@/types";

type ListItemsParams = {
  workspaceId: string;
  type?: ItemType;
  pinned?: boolean;
  page?: number;
  limit?: number;
};

type PaginatedItems = {
  data: ItemResponse[];
  meta: PaginationMeta;
};

async function fetchItems(params: ListItemsParams): Promise<PaginatedItems> {
  const searchParams = new URLSearchParams();
  searchParams.set("workspaceId", params.workspaceId);
  if (params.type) searchParams.set("type", params.type);
  if (params.pinned !== undefined)
    searchParams.set("pinned", String(params.pinned));
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  const res = await fetch(`/api/v1/items?${searchParams.toString()}`);
  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error?.message || "Failed to fetch items");
  }

  return { data: json.data, meta: json.meta };
}

async function fetchItem(id: string): Promise<ItemResponse> {
  const res = await fetch(`/api/v1/items/${id}`);
  const json: ApiResponse<ItemResponse> = await res.json();
  if (!json.success) {
    throw new Error("error" in json ? json.error.message : "Failed to fetch item");
  }
  return json.data;
}

async function createLink(data: {
  workspaceId: string;
  content: string;
  title?: string;
  note?: string;
  tags?: string[];
}): Promise<ItemResponse> {
  const res = await fetch("/api/v1/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, type: "link" }),
  });
  const json: ApiResponse<ItemResponse> = await res.json();
  if (!json.success) {
    throw new Error("error" in json ? json.error.message : "Failed to create link");
  }
  return json.data;
}

async function createNote(data: {
  workspaceId: string;
  title: string;
  content: string;
  tags?: string[];
}): Promise<ItemResponse> {
  const res = await fetch("/api/v1/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, type: "note" }),
  });
  const json: ApiResponse<ItemResponse> = await res.json();
  if (!json.success) {
    throw new Error("error" in json ? json.error.message : "Failed to create note");
  }
  return json.data;
}

async function updateItem(
  id: string,
  data: { title?: string; note?: string | null; content?: string; tags?: string[] }
): Promise<ItemResponse> {
  const res = await fetch(`/api/v1/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<ItemResponse> = await res.json();
  if (!json.success) {
    throw new Error("error" in json ? json.error.message : "Failed to update item");
  }
  return json.data;
}

async function deleteItem(id: string): Promise<void> {
  const res = await fetch(`/api/v1/items/${id}`, { method: "DELETE" });
  const json: ApiResponse<{ deleted: boolean }> = await res.json();
  if (!json.success) {
    throw new Error("error" in json ? json.error.message : "Failed to delete item");
  }
}

async function pinItem(id: string): Promise<ItemResponse> {
  const res = await fetch(`/api/v1/items/${id}/pin`, { method: "POST" });
  const json: ApiResponse<ItemResponse> = await res.json();
  if (!json.success) {
    throw new Error("error" in json ? json.error.message : "Failed to pin item");
  }
  return json.data;
}

async function unpinItem(id: string): Promise<ItemResponse> {
  const res = await fetch(`/api/v1/items/${id}/pin`, { method: "DELETE" });
  const json: ApiResponse<ItemResponse> = await res.json();
  if (!json.success) {
    throw new Error("error" in json ? json.error.message : "Failed to unpin item");
  }
  return json.data;
}

// Hooks

export function useItems(params?: Omit<ListItemsParams, "workspaceId">) {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  return useQuery({
    queryKey: ["items", activeWorkspaceId, params],
    queryFn: () =>
      fetchItems({
        workspaceId: activeWorkspaceId!,
        ...params,
      }),
    enabled: !!activeWorkspaceId,
  });
}

export function useItem(id: string | null) {
  return useQuery({
    queryKey: ["item", id],
    queryFn: () => fetchItem(id!),
    enabled: !!id,
  });
}

export function useCreateLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; note?: string | null; content?: string; tags?: string[] }) =>
      updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function usePinItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pinItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useUnpinItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unpinItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

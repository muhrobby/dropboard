"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { ApiResponse, CollectionResponse } from "@/types/api";

// --- API helpers ---

async function fetchCollections(workspaceId: string): Promise<CollectionResponse[]> {
  const res = await fetch(`/api/v1/collections?workspaceId=${workspaceId}`);
  const json: ApiResponse<CollectionResponse[]> = await res.json();
  if (!json.success) {
    throw new Error("error" in json ? json.error.message : "Failed to fetch collections");
  }
  return json.data;
}

async function createCollection(data: {
  workspaceId: string;
  name: string;
  parentId?: string | null;
}): Promise<CollectionResponse> {
  const res = await fetch("/api/v1/collections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<CollectionResponse> = await res.json();
  if (!json.success) {
    throw new Error("error" in json ? json.error.message : "Failed to create collection");
  }
  return json.data;
}

async function updateCollection(
  id: string,
  data: { workspaceId: string; name?: string; parentId?: string | null },
): Promise<CollectionResponse> {
  const res = await fetch(`/api/v1/collections/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<CollectionResponse> = await res.json();
  if (!json.success) {
    throw new Error("error" in json ? json.error.message : "Failed to update collection");
  }
  return json.data;
}

async function deleteCollection(id: string, workspaceId: string): Promise<void> {
  const res = await fetch(
    `/api/v1/collections/${id}?workspaceId=${workspaceId}`,
    { method: "DELETE" },
  );
  const json: ApiResponse<{ deleted: boolean }> = await res.json();
  if (!json.success) {
    throw new Error("error" in json ? json.error.message : "Failed to delete collection");
  }
}

async function publishCollection(id: string, workspaceId: string): Promise<CollectionResponse> {
  const res = await fetch(`/api/v1/collections/${id}/publish`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspaceId }),
  });
  const json: ApiResponse<CollectionResponse> = await res.json();
  if (!json.success) {
    throw new Error("error" in json ? json.error.message : "Failed to publish board");
  }
  return json.data;
}

async function unpublishCollection(id: string, workspaceId: string): Promise<CollectionResponse> {
  const res = await fetch(
    `/api/v1/collections/${id}/publish?workspaceId=${encodeURIComponent(workspaceId)}`,
    { method: "DELETE" },
  );
  const json: ApiResponse<CollectionResponse> = await res.json();
  if (!json.success) {
    throw new Error("error" in json ? json.error.message : "Failed to unpublish board");
  }
  return json.data;
}

async function moveItemToCollection(
  itemId: string,
  collectionId: string | null,
): Promise<void> {
  const res = await fetch(`/api/v1/items/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collectionId }),
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to move item");
  }
}

// --- Hooks ---

export function useCollections() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  return useQuery({
    queryKey: ["collections", activeWorkspaceId],
    queryFn: () => fetchCollections(activeWorkspaceId!),
    enabled: !!activeWorkspaceId,
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  return useMutation({
    mutationFn: (data: { name: string; parentId?: string | null }) =>
      createCollection({ workspaceId: activeWorkspaceId!, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      parentId?: string | null;
    }) => updateCollection(id, { workspaceId: activeWorkspaceId!, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  return useMutation({
    mutationFn: (id: string) => deleteCollection(id, activeWorkspaceId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useMoveItemToCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      collectionId,
    }: {
      itemId: string;
      collectionId: string | null;
    }) => moveItemToCollection(itemId, collectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function usePublishCollection() {
  const queryClient = useQueryClient();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  return useMutation({
    mutationFn: (id: string) => publishCollection(id, activeWorkspaceId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useUnpublishCollection() {
  const queryClient = useQueryClient();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  return useMutation({
    mutationFn: (id: string) => unpublishCollection(id, activeWorkspaceId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}


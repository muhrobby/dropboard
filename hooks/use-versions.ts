"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { ApiResponse, ItemVersionResponse } from "@/types/api";

// ----- Fetch functions -----

async function fetchVersions(
  itemId: string,
  workspaceId: string,
): Promise<ItemVersionResponse[]> {
  const res = await fetch(
    `/api/v1/items/${itemId}/versions?workspaceId=${workspaceId}`,
  );
  const json: ApiResponse<ItemVersionResponse[]> = await res.json();
  if (!json.success) {
    throw new Error(
      "error" in json ? json.error.message : "Failed to fetch versions",
    );
  }
  return json.data;
}

async function uploadVersion(data: {
  itemId: string;
  workspaceId: string;
  file: File;
  label?: string;
}): Promise<ItemVersionResponse> {
  const formData = new FormData();
  formData.set("workspaceId", data.workspaceId);
  formData.set("file", data.file);
  if (data.label) formData.set("label", data.label);

  const res = await fetch(`/api/v1/items/${data.itemId}/versions`, {
    method: "POST",
    body: formData,
  });
  const json: ApiResponse<ItemVersionResponse> = await res.json();
  if (!json.success) {
    throw new Error(
      "error" in json ? json.error.message : "Failed to upload version",
    );
  }
  return json.data;
}

async function revertVersion(data: {
  itemId: string;
  versionId: string;
  workspaceId: string;
}): Promise<void> {
  const res = await fetch(
    `/api/v1/items/${data.itemId}/versions/${data.versionId}/revert`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: data.workspaceId }),
    },
  );
  const json: ApiResponse<{ reverted: boolean }> = await res.json();
  if (!json.success) {
    throw new Error(
      "error" in json ? json.error.message : "Failed to revert version",
    );
  }
}

// ----- Hooks -----

export function useItemVersions(itemId: string | null) {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  return useQuery({
    queryKey: ["item-versions", itemId, activeWorkspaceId],
    queryFn: () => fetchVersions(itemId!, activeWorkspaceId!),
    enabled: !!itemId && !!activeWorkspaceId,
  });
}

export function useUploadVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadVersion,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["item-versions", variables.itemId],
      });
      // Also refresh the item itself since fileAssetId changed
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["item", variables.itemId] });
    },
  });
}

export function useRevertVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revertVersion,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["item-versions", variables.itemId],
      });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["item", variables.itemId] });
    },
  });
}

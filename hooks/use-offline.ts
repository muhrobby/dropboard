"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse, ItemResponse } from "@/types/api";

async function markOffline(id: string): Promise<ItemResponse> {
  const res = await fetch(`/api/v1/items/${id}/offline`, { method: "POST" });
  const json: ApiResponse<ItemResponse> = await res.json();
  if (!json.success) {
    throw new Error("error" in json ? json.error.message : "Failed to mark offline");
  }
  return json.data;
}

async function removeOffline(id: string): Promise<ItemResponse> {
  const res = await fetch(`/api/v1/items/${id}/offline`, { method: "DELETE" });
  const json: ApiResponse<ItemResponse> = await res.json();
  if (!json.success) {
    throw new Error("error" in json ? json.error.message : "Failed to remove offline");
  }
  return json.data;
}

export function useMarkOffline(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markOffline(itemId),
    onSuccess: (updated) => {
      qc.setQueryData<ItemResponse>(["item", itemId], updated);
      qc.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useRemoveOffline(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => removeOffline(itemId),
    onSuccess: (updated) => {
      qc.setQueryData<ItemResponse>(["item", itemId], updated);
      qc.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

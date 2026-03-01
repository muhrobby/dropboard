"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { ApiResponse, ItemCommentResponse } from "@/types/api";

// ----- Fetch functions -----

async function fetchComments(
  itemId: string,
  workspaceId: string,
): Promise<ItemCommentResponse[]> {
  const res = await fetch(
    `/api/v1/items/${itemId}/comments?workspaceId=${workspaceId}`,
  );
  const json: ApiResponse<ItemCommentResponse[]> = await res.json();
  if (!json.success) {
    throw new Error(
      "error" in json ? json.error.message : "Failed to fetch comments",
    );
  }
  return json.data;
}

async function postComment(data: {
  itemId: string;
  workspaceId: string;
  body: string;
}): Promise<ItemCommentResponse> {
  const res = await fetch(`/api/v1/items/${data.itemId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspaceId: data.workspaceId, body: data.body }),
  });
  const json: ApiResponse<ItemCommentResponse> = await res.json();
  if (!json.success) {
    throw new Error(
      "error" in json ? json.error.message : "Failed to post comment",
    );
  }
  return json.data;
}

async function removeComment(data: {
  itemId: string;
  commentId: string;
  workspaceId: string;
}): Promise<void> {
  const res = await fetch(
    `/api/v1/items/${data.itemId}/comments/${data.commentId}?workspaceId=${data.workspaceId}`,
    { method: "DELETE" },
  );
  const json: ApiResponse<{ deleted: boolean }> = await res.json();
  if (!json.success) {
    throw new Error(
      "error" in json ? json.error.message : "Failed to delete comment",
    );
  }
}

// ----- Hooks -----

export function useItemComments(itemId: string | null) {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  return useQuery({
    queryKey: ["item-comments", itemId, activeWorkspaceId],
    queryFn: () => fetchComments(itemId!, activeWorkspaceId!),
    enabled: !!itemId && !!activeWorkspaceId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postComment,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["item-comments", variables.itemId],
      });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeComment,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["item-comments", variables.itemId],
      });
    },
  });
}

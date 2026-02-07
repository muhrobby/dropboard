"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/stores/workspace-store";

type BatchAction = "pin" | "unpin" | "delete";

type BatchActionParams = {
  action: BatchAction;
  ids: string[];
};

async function batchAction(
  workspaceId: string,
  params: BatchActionParams,
): Promise<{ action: BatchAction; updated: number }> {
  const res = await fetch("/api/v1/items/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: params.action,
      ids: params.ids,
      workspaceId,
    }),
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Batch action failed");
  }

  return json.data;
}

export function useBatchAction() {
  const queryClient = useQueryClient();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  return useMutation({
    mutationFn: (params: BatchActionParams) =>
      batchAction(activeWorkspaceId!, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["trash"] });
    },
  });
}

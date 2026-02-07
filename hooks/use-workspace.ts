"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useEffect } from "react";
import type { ApiResponse, WorkspaceResponse } from "@/types/api";

async function fetchWorkspaces(): Promise<WorkspaceResponse[]> {
  try {
    const res = await fetch("/api/v1/workspaces");

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const json: ApiResponse<WorkspaceResponse[]> = await res.json();
    if (!json.success) {
      throw new Error(
        "error" in json ? json.error.message : "Failed to fetch workspaces"
      );
    }
    return json.data;
  } catch (error) {
    console.error("fetchWorkspaces error:", error);
    throw error;
  }
}

async function createWorkspace(name: string): Promise<WorkspaceResponse> {
  const res = await fetch("/api/v1/workspaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, type: "team" }),
  });
  const json: ApiResponse<WorkspaceResponse> = await res.json();
  if (!json.success) {
    throw new Error(
      "error" in json ? json.error.message : "Failed to create workspace"
    );
  }
  return json.data;
}

export function useWorkspaces() {
  const setWorkspaces = useWorkspaceStore((s) => s.setWorkspaces);

  const query = useQuery({
    queryKey: ["workspaces"],
    queryFn: fetchWorkspaces,
  });

  useEffect(() => {
    if (query.data) {
      setWorkspaces(query.data);
    }
  }, [query.data, setWorkspaces]);

  return query;
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

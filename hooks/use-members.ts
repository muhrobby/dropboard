"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type {
  ApiResponse,
  MemberResponse,
  InviteResponse,
  ActivityLogResponse,
} from "@/types/api";

// ─── Members ────────────────────────────────────────────────────

async function fetchMembers(workspaceId: string): Promise<MemberResponse[]> {
  const res = await fetch(`/api/v1/workspaces/${workspaceId}/members`);
  const json: ApiResponse<MemberResponse[]> = await res.json();
  if (!json.success) {
    throw new Error("error" in json ? json.error.message : "Failed to fetch members");
  }
  return json.data;
}

async function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: string
): Promise<MemberResponse> {
  const res = await fetch(`/api/v1/workspaces/${workspaceId}/members/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  const json: ApiResponse<MemberResponse> = await res.json();
  if (!json.success) {
    throw new Error("error" in json ? json.error.message : "Failed to update role");
  }
  return json.data;
}

async function removeMember(workspaceId: string, userId: string): Promise<void> {
  const res = await fetch(`/api/v1/workspaces/${workspaceId}/members/${userId}`, {
    method: "DELETE",
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to remove member");
  }
}

export function useMembers() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  return useQuery({
    queryKey: ["members", activeWorkspaceId],
    queryFn: () => fetchMembers(activeWorkspaceId!),
    enabled: !!activeWorkspaceId,
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      updateMemberRole(activeWorkspaceId!, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", activeWorkspaceId] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  return useMutation({
    mutationFn: (userId: string) => removeMember(activeWorkspaceId!, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", activeWorkspaceId] });
    },
  });
}

// ─── Invites ────────────────────────────────────────────────────

async function fetchInvites(workspaceId: string): Promise<InviteResponse[]> {
  const res = await fetch(`/api/v1/workspaces/${workspaceId}/invites`);
  const json: ApiResponse<InviteResponse[]> = await res.json();
  if (!json.success) {
    throw new Error("error" in json ? json.error.message : "Failed to fetch invites");
  }
  return json.data;
}

async function createInvite(
  workspaceId: string,
  data: { targetIdentifier: string; role: string }
): Promise<InviteResponse> {
  const res = await fetch(`/api/v1/workspaces/${workspaceId}/invites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<InviteResponse> = await res.json();
  if (!json.success) {
    throw new Error("error" in json ? json.error.message : "Failed to create invite");
  }
  return json.data;
}

async function cancelInvite(workspaceId: string, inviteId: string): Promise<void> {
  const res = await fetch(`/api/v1/workspaces/${workspaceId}/invites/${inviteId}`, {
    method: "DELETE",
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to cancel invite");
  }
}

async function acceptInvite(token: string): Promise<unknown> {
  const res = await fetch(`/api/v1/invites/${token}/accept`, { method: "POST" });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to accept invite");
  }
  return json.data;
}

async function getInviteInfo(token: string): Promise<InviteResponse> {
  const res = await fetch(`/api/v1/invites/${token}/accept`);
  const json: ApiResponse<InviteResponse> = await res.json();
  if (!json.success) {
    throw new Error("error" in json ? json.error.message : "Invite not found");
  }
  return json.data;
}

export function useInvites() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  return useQuery({
    queryKey: ["invites", activeWorkspaceId],
    queryFn: () => fetchInvites(activeWorkspaceId!),
    enabled: !!activeWorkspaceId,
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  return useMutation({
    mutationFn: (data: { targetIdentifier: string; role: string }) =>
      createInvite(activeWorkspaceId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites", activeWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: ["activity", activeWorkspaceId] });
    },
  });
}

export function useCancelInvite() {
  const queryClient = useQueryClient();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  return useMutation({
    mutationFn: (inviteId: string) => cancelInvite(activeWorkspaceId!, inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites", activeWorkspaceId] });
    },
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: acceptInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function useInviteInfo(token: string | null) {
  return useQuery({
    queryKey: ["invite-info", token],
    queryFn: () => getInviteInfo(token!),
    enabled: !!token,
    retry: false,
  });
}

// ─── Activity ───────────────────────────────────────────────────

type ActivityPage = {
  logs: ActivityLogResponse[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

async function fetchActivity(
  workspaceId: string,
  page: number
): Promise<ActivityPage> {
  const params = new URLSearchParams({
    workspaceId,
    page: String(page),
    limit: "20",
  });
  const res = await fetch(`/api/v1/activity?${params.toString()}`);
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "Failed to fetch activity");
  }
  return { logs: json.data, meta: json.meta };
}

export function useActivity() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  return useInfiniteQuery({
    queryKey: ["activity", activeWorkspaceId],
    queryFn: ({ pageParam }) => fetchActivity(activeWorkspaceId!, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    enabled: !!activeWorkspaceId,
  });
}

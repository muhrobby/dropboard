"use client";

import { useQuery } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useState, useEffect } from "react";
import type { ApiResponse, ItemResponse, PaginationMeta } from "@/types/api";
import type { ItemType } from "@/types";

type SearchParams = {
  q: string;
  type?: ItemType;
  tags?: string[]; // array of tags
  page?: number;
  limit?: number;
};

type PaginatedSearchResults = {
  data: ItemResponse[];
  meta: PaginationMeta;
};

async function fetchSearchResults(
  workspaceId: string,
  params: SearchParams,
): Promise<PaginatedSearchResults> {
  const searchParams = new URLSearchParams();
  searchParams.set("workspaceId", workspaceId);
  searchParams.set("q", params.q);
  if (params.type) searchParams.set("type", params.type);
  if (params.tags && params.tags.length > 0) {
    searchParams.set("tags", params.tags.join(","));
  }
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  const res = await fetch(`/api/v1/search?${searchParams.toString()}`);
  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error?.message || "Search failed");
  }

  return { data: json.data, meta: json.meta };
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function useSearch(params: SearchParams) {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const debouncedQuery = useDebounce(params.q, 300);

  return useQuery({
    queryKey: [
      "search",
      activeWorkspaceId,
      debouncedQuery,
      params.type,
      params.tags,
      params.page,
    ],
    queryFn: () =>
      fetchSearchResults(activeWorkspaceId!, {
        ...params,
        q: debouncedQuery,
      }),
    enabled: !!activeWorkspaceId && debouncedQuery.length >= 1,
    placeholderData: (prev) => prev,
  });
}

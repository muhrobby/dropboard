"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse, ItemResponse } from "@/types/api";

type UploadParams = {
  file: File;
  workspaceId: string;
  title?: string;
  note?: string;
  tags?: string[];
  isPinned?: boolean;
};

type UploadMultipleParams = {
  files: File[];
  workspaceId: string;
  folderName?: string;
  note?: string;
  tags?: string[];
  isPinned?: boolean;
};

type UploadState = {
  progress: number;
  isUploading: boolean;
};

async function uploadFile(params: UploadParams): Promise<ItemResponse> {
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("workspaceId", params.workspaceId);
  if (params.title) formData.append("title", params.title);
  if (params.note) formData.append("note", params.note);
  if (params.tags && params.tags.length > 0) {
    formData.append("tags", JSON.stringify(params.tags));
  }
  if (params.isPinned) formData.append("isPinned", "true");

  const res = await fetch("/api/v1/files/upload", {
    method: "POST",
    body: formData,
  });

  const json: ApiResponse<ItemResponse> = await res.json();
  if (!json.success) {
    throw new Error(
      "error" in json ? json.error.message : "Failed to upload file"
    );
  }
  return json.data;
}

async function uploadMultipleFiles(params: UploadMultipleParams): Promise<ItemResponse[]> {
  const results: ItemResponse[] = [];

  // Upload semua files secara berurutan
  for (const file of params.files) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("workspaceId", params.workspaceId);

    // Untuk multiple upload dengan folder, tambahkan folder name ke title
    if (params.folderName) {
      const fileName = file.name.replace(/\.[^.]+$/, "");
      formData.append("title", `${params.folderName}/${fileName}`);
    }

    if (params.note) formData.append("note", params.note);
    if (params.tags && params.tags.length > 0) {
      formData.append("tags", JSON.stringify(params.tags));
    }
    if (params.isPinned) formData.append("isPinned", "true");

    const res = await fetch("/api/v1/files/upload", {
      method: "POST",
      body: formData,
    });

    const json: ApiResponse<ItemResponse> = await res.json();
    if (!json.success) {
      throw new Error(
        "error" in json ? json.error.message : "Failed to upload file"
      );
    }
    results.push(json.data);
  }

  return results;
}

export function useUpload() {
  const queryClient = useQueryClient();
  const [uploadState, setUploadState] = useState<UploadState>({
    progress: 0,
    isUploading: false,
  });

  const mutation = useMutation({
    mutationFn: async (params: UploadParams) => {
      setUploadState({ progress: 0, isUploading: true });

      // Simulate progress since fetch doesn't support upload progress natively
      const progressInterval = setInterval(() => {
        setUploadState((prev) => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90),
        }));
      }, 200);

      try {
        const result = await uploadFile(params);
        clearInterval(progressInterval);
        setUploadState({ progress: 100, isUploading: false });
        return result;
      } catch (error) {
        clearInterval(progressInterval);
        setUploadState({ progress: 0, isUploading: false });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      // Reset after a brief delay to show 100%
      setTimeout(() => {
        setUploadState({ progress: 0, isUploading: false });
      }, 500);
    },
  });

  return {
    ...mutation,
    progress: uploadState.progress,
    isUploading: uploadState.isUploading,
  };
}

export function useUploadMultiple() {
  const queryClient = useQueryClient();
  const [uploadState, setUploadState] = useState<UploadState>({
    progress: 0,
    isUploading: false,
  });

  const mutation = useMutation({
    mutationFn: async (params: UploadMultipleParams) => {
      setUploadState({ progress: 0, isUploading: true });

      const totalFiles = params.files.length;

      try {
        const results = await uploadMultipleFiles(params);

        setUploadState({ progress: 100, isUploading: false });
        return results;
      } catch (error) {
        setUploadState({ progress: 0, isUploading: false });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      setTimeout(() => {
        setUploadState({ progress: 0, isUploading: false });
      }, 500);
    },
  });

  return {
    ...mutation,
    progress: uploadState.progress,
    isUploading: uploadState.isUploading,
  };
}

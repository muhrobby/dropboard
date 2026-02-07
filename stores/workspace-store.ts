"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type Workspace = {
  id: string;
  name: string;
  type: "personal" | "team";
  role?: string;
  storageUsedBytes: number;
};

type WorkspaceStore = {
  activeWorkspaceId: string | null;
  workspaces: Workspace[];
  setActiveWorkspace: (id: string) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  getActiveWorkspace: () => Workspace | undefined;
};

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      activeWorkspaceId: null,
      workspaces: [],
      setActiveWorkspace: (id: string) => set({ activeWorkspaceId: id }),
      setWorkspaces: (workspaces: Workspace[]) => {
        const state = get();
        const updates: Partial<WorkspaceStore> = { workspaces };

        // If no active workspace or active workspace no longer exists, set to first
        if (
          !state.activeWorkspaceId ||
          !workspaces.find((w) => w.id === state.activeWorkspaceId)
        ) {
          updates.activeWorkspaceId = workspaces[0]?.id ?? null;
        }

        set(updates);
      },
      getActiveWorkspace: () => {
        const state = get();
        return state.workspaces.find((w) => w.id === state.activeWorkspaceId);
      },
    }),
    {
      name: "dropboard-workspace",
      partialize: (state) => ({
        activeWorkspaceId: state.activeWorkspaceId,
      }),
    }
  )
);

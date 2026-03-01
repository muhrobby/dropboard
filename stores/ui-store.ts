"use client";

import { create } from "zustand";

type UIStore = {
  isSidebarOpen: boolean;
  isUploadModalOpen: boolean;
  uploadTargetCollectionId: string | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setUploadModalOpen: (open: boolean, collectionId?: string | null) => void;
};

export const useUIStore = create<UIStore>()((set) => ({
  isSidebarOpen: false,
  isUploadModalOpen: false,
  uploadTargetCollectionId: null,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open: boolean) => set({ isSidebarOpen: open }),
  setUploadModalOpen: (open: boolean, collectionId?: string | null) =>
    set({
      isUploadModalOpen: open,
      uploadTargetCollectionId: open ? (collectionId ?? null) : null,
    }),
}));

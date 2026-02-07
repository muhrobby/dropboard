"use client";

import { create } from "zustand";

type UIStore = {
  isSidebarOpen: boolean;
  isUploadModalOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setUploadModalOpen: (open: boolean) => void;
};

export const useUIStore = create<UIStore>()((set) => ({
  isSidebarOpen: false,
  isUploadModalOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open: boolean) => set({ isSidebarOpen: open }),
  setUploadModalOpen: (open: boolean) => set({ isUploadModalOpen: open }),
}));

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useWorkspaces } from "@/hooks/use-workspace";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { AppSidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();
  const { data: workspaces, isLoading: isWorkspacesLoading } = useWorkspaces();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isSessionPending && !session?.user) {
      router.push("/login");
    }
  }, [isSessionPending, session, router]);

  // Auto-select first workspace if none active
  useEffect(() => {
    if (workspaces && workspaces.length > 0 && !activeWorkspaceId) {
      setActiveWorkspace(workspaces[0].id);
    }
  }, [workspaces, activeWorkspaceId, setActiveWorkspace]);

  // Show loading skeleton while session is being fetched
  if (isSessionPending || isWorkspacesLoading) {
    return (
      <div className="flex h-[100dvh] w-full overflow-hidden bg-zinc-50 dark:bg-zinc-950">
        {/* Sidebar skeleton - desktop */}
        <div className="hidden md:flex md:w-72 md:flex-col md:border-r md:border-zinc-200 dark:md:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="space-y-3 mt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </div>
        {/* Main content skeleton */}
        <div className="flex flex-1 flex-col relative">
          <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md flex items-center px-6">
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
          <div className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
            <div className="space-y-3">
              <Skeleton className="h-10 w-64 rounded-xl" />
              <Skeleton className="h-5 w-96 rounded-lg" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-foreground selection:bg-primary/20">
      {/* Desktop sidebar */}
      <AppSidebar />

      {/* Mobile sidebar overlay */}
      <MobileSidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <Topbar />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0 scroll-smooth">
          <div className="mx-auto w-full max-w-7xl relative">
            {children}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <MobileNav />
      </div>
    </div>
  );
}

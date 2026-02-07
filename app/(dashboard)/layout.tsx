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
import { TooltipProvider } from "@/components/ui/tooltip";

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
      <div className="flex h-dvh">
        {/* Sidebar skeleton - desktop */}
        <div className="hidden md:flex md:w-64 md:flex-col md:border-r p-4 space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-full" />
          <div className="space-y-2 mt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
        {/* Main content skeleton */}
        <div className="flex flex-1 flex-col">
          <div className="h-14 border-b flex items-center px-4">
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="flex-1 p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex h-dvh overflow-hidden">
        {/* Desktop sidebar */}
        <AppSidebar />

        {/* Mobile sidebar overlay */}
        <MobileSidebar />

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar />

          <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
            {children}
          </main>

          {/* Mobile bottom nav */}
          <MobileNav />
        </div>
      </div>
    </TooltipProvider>
  );
}

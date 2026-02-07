"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useWorkspaces } from "@/hooks/use-workspace";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { SidebarV2 } from "@/components/layout/v2/sidebar";
import { Topbar } from "@/components/layout/topbar"; // Reuse Topbar for now
import { MobileNav } from "@/components/layout/mobile-nav"; // Reuse MobileNav for now
import { MobileSidebar } from "@/components/layout/mobile-sidebar"; // Reuse MobileSidebar for now
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLayoutV2({
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
      <div className="flex h-screen bg-muted/30">
        {/* Sidebar skeleton - desktop */}
        <div className="hidden md:flex md:w-64 md:flex-col md:border-r bg-background p-4 space-y-4">
          <Skeleton className="h-12 w-full mb-8" /> {/* Brand area */}
          <Skeleton className="h-10 w-full" /> {/* Workspace switcher */}
          <div className="space-y-6 mt-8">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20 mb-2" /> {/* Group Title */}
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        </div>
        {/* Main content skeleton */}
        <div className="flex flex-1 flex-col">
          <div className="h-16 border-b flex items-center px-8 bg-background">
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="flex-1 p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-muted/10">
      {/* Desktop sidebar V2 */}
      <SidebarV2 />

      {/* Mobile sidebar overlay (Reused) */}
      <MobileSidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Topbar (will need V2 later) */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b">
          <Topbar />
        </div>

        <main className="flex-1 overflow-y-auto p-6 md:p-8 relative">
          <div className="max-w-7xl mx-auto space-y-8">{children}</div>
        </main>

        {/* Mobile bottom nav (Reused) */}
        <MobileNav />
      </div>
    </div>
  );
}

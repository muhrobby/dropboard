"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ImageDown,
  Bookmark,
  Search,
  Users,
  Activity,
  Settings,
  X,
  Trash2,
  UserCircle,
  Shield,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin" | "super_admin";
}

const navItems = [
  { href: "/dashboard/drops", label: "Drops", icon: ImageDown },
  { href: "/dashboard/pinboard", label: "Pinboard", icon: Bookmark },
  { href: "/dashboard/search", label: "Search", icon: Search },
  { href: "/dashboard/team", label: "Team", icon: Users },
  { href: "/dashboard/activity", label: "Activity", icon: Activity },
  { href: "/dashboard/trash", label: "Trash", icon: Trash2 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/settings/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/profile", label: "Profile", icon: UserCircle },
];

export function MobileSidebar() {
  const pathname = usePathname();
  const { isSidebarOpen, setSidebarOpen } = useUIStore();

  // Fetch current user to check admin role
  const { data: userData } = useQuery<{ success: boolean; data: CurrentUser }>({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await fetch("/api/v1/me");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false,
  });

  const isAdmin =
    userData?.data?.role === "admin" || userData?.data?.role === "super_admin";

  if (!isSidebarOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r md:hidden">
        <div className="flex h-14 items-center justify-between border-b px-4">
          <span className="text-lg font-bold">Dropboard</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="px-3 py-3">
          <WorkspaceSwitcher />
        </div>

        <ScrollArea className="flex-1 px-3">
          <nav className="space-y-1">
            {navItems.map((item) => {
              // Dashboard should only be active when exactly on /dashboard
              const isExactDashboard = item.href === "/dashboard" && pathname === "/dashboard";
              const isPathMatch =
                item.href !== "/dashboard" &&
                (pathname === item.href || pathname.startsWith(item.href + "/"));

              // Check if a more specific menu item exists for this path
              const hasMoreSpecificMatch = navItems.some(
                (otherItem) =>
                  otherItem !== item &&
                  otherItem.href.startsWith(item.href + "/") &&
                  (pathname === otherItem.href ||
                    pathname.startsWith(otherItem.href + "/")),
              );

              const isActive = isExactDashboard || (isPathMatch && !hasMoreSpecificMatch);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Admin Portal Link - Only visible for admin/super_admin */}
          {isAdmin && (
            <div className="mt-6 pt-6 border-t">
              <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Administration
              </p>
              <Link
                href="/admin"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "text-sidebar-foreground/70 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400",
                )}
              >
                <Shield className="h-4 w-4" />
                Admin Portal
              </Link>
            </div>
          )}
        </ScrollArea>
      </aside>
    </>
  );
}

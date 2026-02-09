"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ImageDown,
  Bookmark,
  Search,
  Users,
  Activity,
  Settings,
  Trash2,
  UserCircle,
  Shield,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin" | "super_admin";
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
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

export function AppSidebar() {
  const pathname = usePathname();

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

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r bg-sidebar">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="text-lg font-bold">
          Dropboard
        </Link>
      </div>

      <div className="px-3 py-3">
        <WorkspaceSwitcher />
      </div>

      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-1">
          {navItems.map((item) => {
            // Dashboard should only be active when exactly on /dashboard
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === item.href ||
                  pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
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
  );
}

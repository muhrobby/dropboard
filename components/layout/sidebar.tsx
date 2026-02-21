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
  ListTodo,
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
  { href: "/dashboard/todo", label: "Todo", icon: ListTodo },
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
    <aside className="hidden md:flex md:w-72 md:flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 backdrop-blur-xl z-20 transition-all duration-300">
      <div className="flex h-16 items-center px-6 border-b border-transparent">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-xl font-bold tracking-tight hover:opacity-80 transition-opacity"
        >
          <div className="size-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
            <LayoutDashboard className="size-4" />
          </div>
          Dropboard
        </Link>
      </div>

      <div className="px-4 py-4">
        <WorkspaceSwitcher />
      </div>

      <ScrollArea className="flex-1 px-4 pb-6">
        <div className="space-y-6">
          <nav className="space-y-1">
            <p className="px-3 mb-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              Overview
            </p>
            {navItems.slice(0, 1).map((item) => {
              const isActive = pathname === "/dashboard";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-zinc-100 dark:bg-zinc-800/80 text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-foreground",
                  )}
                >
                  <item.icon
                    className={cn(
                      "size-4.5 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <nav className="space-y-1">
            <p className="px-3 mb-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              Workspace
            </p>
            {navItems.slice(1, 8).map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-zinc-100 dark:bg-zinc-800/80 text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-foreground",
                  )}
                >
                  <item.icon
                    className={cn(
                      "size-4.5 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <nav className="space-y-1">
            <p className="px-3 mb-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              Configuration
            </p>
            {navItems.slice(8).map((item) => {
              const isExactSettings = item.href === "/dashboard/settings" && pathname === "/dashboard/settings";
              const isBilling = item.href === "/dashboard/settings/billing" && pathname.startsWith("/dashboard/settings/billing");
              const isProfile = item.href === "/dashboard/profile" && pathname.startsWith("/dashboard/profile");
              
              const isActive = isExactSettings || isBilling || isProfile;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-zinc-100 dark:bg-zinc-800/80 text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-foreground",
                  )}
                >
                  <item.icon
                    className={cn(
                      "size-4.5 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Admin Portal Link - Only visible for admin/super_admin */}
          {isAdmin && (
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <nav className="space-y-1">
                <p className="px-3 mb-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Shield className="size-3 text-amber-500" />
                  Administration
                </p>
                <Link
                  href="/admin"
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    pathname.startsWith("/admin")
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm"
                      : "text-muted-foreground hover:bg-amber-500/5 hover:text-amber-600 dark:hover:text-amber-400",
                  )}
                >
                  <Shield
                    className={cn(
                      "size-4.5 transition-colors",
                      pathname.startsWith("/admin")
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-muted-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400"
                    )}
                  />
                  Admin Portal
                </Link>
              </nav>
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

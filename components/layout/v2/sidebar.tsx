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
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkspaceSwitcher } from "../workspace-switcher";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  label?: string; // Optional header
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard-v2", label: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard-v2/activity", label: "Activity", icon: Activity },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/dashboard-v2/drops", label: "All Drops", icon: FolderOpen },
      { href: "/dashboard-v2/pinboard", label: "Pinboard", icon: Bookmark },
      { href: "/dashboard-v2/search", label: "Search", icon: Search },
    ],
  },
  {
    label: "Manage",
    items: [
      {
        href: "/dashboard-v2/settings/team",
        label: "Team Members",
        icon: Users,
      },
      { href: "/dashboard-v2/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function SidebarV2() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r bg-background h-screen sticky top-0">
      {/* Brand Header */}
      <div className="flex h-16 items-center px-6 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">D</span>
          </div>
          <span className="text-lg font-bold tracking-tight">Dropboard</span>
        </div>
      </div>

      {/* Workspace Switcher */}
      <div className="px-4 py-4">
        <WorkspaceSwitcher />
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-4">
        <nav className="space-y-6 pb-6">
          {navGroups.map((group, i) => (
            <div key={i} className="space-y-2">
              {group.label && (
                <h4 className="px-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
                  {group.label}
                </h4>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary/5 text-primary" // Subtle active state
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-4 w-4 transition-colors",
                          isActive
                            ? "text-primary"
                            : "text-muted-foreground group-hover:text-foreground",
                        )}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer Area (Optional User Profile or Credits) */}
      <div className="p-4 border-t text-xs text-muted-foreground text-center">
        Dropboard v2.0 (Dev)
      </div>
    </aside>
  );
}

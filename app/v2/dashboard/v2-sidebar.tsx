"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { TierBadge } from "@/components/layout/tier-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ImageDown,
  Bookmark,
  Search,
  Users,
  Activity,
  Settings,
  ChartBar,
  FolderKanban,
  Layers,
  Zap,
  Package,
} from "lucide-react";

const mainNavItems = [
  { href: "/v2", label: "Dashboard", icon: ChartBar },
  { href: "/v2/drops", label: "Drops", icon: ImageDown },
  { href: "/v2/pinboard", label: "Pinboard", icon: Bookmark },
  { href: "/v2/search", label: "Search", icon: Search },
  { href: "/v2/team", label: "Team", icon: Users },
  { href: "/v2/activity", label: "Activity", icon: Activity },
  { href: "/v2/settings", label: "Settings", icon: Settings },
];

const secondaryNavItems = [
  { href: "/v2/billing", label: "Billing", icon: Package },
  { href: "/v2/workspace", label: "Workspaces", icon: FolderKanban },
  { href: "/v2/trash", label: "Trash", icon: Layers },
  { href: "/v2/notifications", label: "Notifications", icon: Zap },
];

export function V2Sidebar() {
  const pathname = usePathname();

  const isMainActive = pathname === "/v2";

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r bg-sidebar h-full">
      <div className="flex flex-col h-14 items-center border-b px-4">
        <Link href="/v2" className="flex items-center gap-3 text-lg font-bold transition-colors hover:text-primary">
          <ChartBar className="h-6 w-6" />
          <span>Dropboard v2</span>
        </Link>
      </div>

      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-6">
          <p className="px-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
            Main
          </p>

          {mainNavItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}

        <p className="px-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
            Secondary
          </p>

        {secondaryNavItems.map((item) => {
          const isActive = pathname === item.href;

          return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="mt-auto px-3 py-4 border-t">
        <TierBadge />
      </div>
    </aside>
  );
}

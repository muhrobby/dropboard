"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ImageDown, Bookmark, Search, Users, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Activity, Settings, Trash2 } from "lucide-react";

const mainNavItems = [
  { href: "/dashboard/drops", label: "Drops", icon: ImageDown },
  { href: "/dashboard/pinboard", label: "Pinboard", icon: Bookmark },
  { href: "/dashboard/search", label: "Search", icon: Search },
  { href: "/dashboard/team", label: "Team", icon: Users },
];

const moreNavItems = [
  { href: "/dashboard/activity", label: "Activity", icon: Activity },
  { href: "/dashboard/trash", label: "Trash", icon: Trash2 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const isMoreActive = moreNavItems.some(
    (item) =>
      pathname === item.href || pathname.startsWith(item.href + "/")
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-200/50 dark:border-zinc-800/50 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.1)] transition-all">
      <div className="flex h-[4.5rem] items-center justify-around px-2">
        {mainNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex flex-col items-center justify-center gap-1.5 w-16 h-full transition-all duration-300",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "relative flex items-center justify-center p-1.5 rounded-xl transition-all duration-300",
                  isActive && "bg-primary/10"
                )}
              >
                <item.icon className={cn("size-5 transition-transform duration-300", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn("text-[10px] font-medium tracking-wide transition-all", isActive ? "font-semibold opacity-100" : "opacity-80")}>{item.label}</span>
            </Link>
          );
        })}

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "group flex flex-col items-center justify-center gap-1.5 w-16 h-full transition-all duration-300 outline-none",
              isMoreActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div
              className={cn(
                "relative flex items-center justify-center p-1.5 rounded-xl transition-all duration-300",
                isMoreActive && "bg-primary/10"
              )}
            >
              <MoreHorizontal className={cn("size-5 transition-transform duration-300", isMoreActive && "scale-110")} strokeWidth={isMoreActive ? 2.5 : 2} />
            </div>
            <span className={cn("text-[10px] font-medium tracking-wide transition-all", isMoreActive ? "font-semibold opacity-100" : "opacity-80")}>More</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" sideOffset={12} className="w-48 rounded-2xl p-2 shadow-xl border-zinc-200/50 dark:border-zinc-800/50 mb-2 animate-in fade-in zoom-in-95 duration-200">
            {moreNavItems.map((item) => (
              <DropdownMenuItem key={item.href} asChild className="rounded-xl cursor-pointer px-3 py-2.5 my-0.5 focus:bg-zinc-100 dark:focus:bg-zinc-800">
                <Link href={item.href} className="flex items-center gap-3 text-sm font-medium">
                  <item.icon className="size-4.5 text-muted-foreground" />
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}

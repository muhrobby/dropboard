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
import { Activity, Settings } from "lucide-react";

const mainNavItems = [
  { href: "/drops", label: "Drops", icon: ImageDown },
  { href: "/pinboard", label: "Pinboard", icon: Bookmark },
  { href: "/search", label: "Search", icon: Search },
  { href: "/team", label: "Team", icon: Users },
];

const moreNavItems = [
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const isMoreActive = moreNavItems.some(
    (item) =>
      pathname === item.href || pathname.startsWith(item.href + "/")
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {mainNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors",
              isMoreActive
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="mb-2">
            {moreNavItems.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Activity,
  Settings,
  MessageSquare,
  Layers,
  LogOut,
} from "lucide-react";

export function V2MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 w-full border-t bg-background md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        <Link
          href="/v2"
          className={cn(
            "flex flex-col items-center gap-1 text-xs transition-colors",
            pathname === "/v2" ? "text-primary" : "text-muted-foreground",
          )}
        >
          <Layers className="h-5 w-5" />
          <span>Home</span>
        </Link>

        <Link
          href="/v2/drops"
          className={cn(
            "flex flex-col items-center gap-1 text-xs transition-colors",
            pathname === "/v2/drops" ? "text-primary" : "text-muted-foreground",
          )}
        >
          <MessageSquare className="h-5 w-5" />
          <span>Drops</span>
        </Link>

        <Link
          href="/v2/search"
          className={cn(
            "flex flex-col items-center gap-1 text-xs transition-colors",
            pathname === "/v2/search"
              ? "text-primary"
              : "text-muted-foreground",
          )}
        >
          <Activity className="h-5 w-5" />
          <span>Search</span>
        </Link>

        <Link
          href="/v2/settings"
          className={cn(
            "flex flex-col items-center gap-1 text-xs transition-colors",
            pathname === "/v2/settings"
              ? "text-primary"
              : "text-muted-foreground",
          )}
        >
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </Link>
      </div>
    </nav>
  );
}

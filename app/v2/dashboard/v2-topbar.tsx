"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import { usePathname } from "next/navigation";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { TierBadge } from "@/components/layout/tier-badge";
import {
  Search,
  Bell,
  Menu,
  X,
  ChevronDown,
  Settings,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { V2SearchDialog as SearchDialog } from "./v2-search-dialog";

export function V2Topbar() {
  const { data: session, isPending: isSessionPending } = useSession();
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const userInitials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
        : "U";

  return (
    <>
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchOpen(true)}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <h1 className="text-lg font-bold bg-gradient-to-r from-primary/20 via-primary/90 to-primary/60 bg-clip-text text-transparent">
            Dropboard
          </h1>
        </div>

        <div className="flex items-center gap-4 md:flex">
          <TierBadge />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
              >
                <div className="flex items-center gap-2">
                  {userInitials}
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm text-muted-foreground">
                  {session?.user?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session?.user?.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href="/v2/settings"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/v2/billing"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Package className="h-4 w-4 text-muted-foreground" />
                  Billing
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  signOut();
                }}
              >
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSearchOpen(true)}
          className="hidden md:flex"
        >
          <Search className="h-5 w-5" />
        </Button>
      </div>

      <Link
        href="/v2"
        className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 rounded-md px-4 py-2 font-medium text-primary transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <span className="hidden md:inline">Notifications</span>
          </div>
          <Search className="h-5 w-5" />
        </div>
      </Link>
    </header>

    <SearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}

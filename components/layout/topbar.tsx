"use client";

import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, Search } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import Link from "next/link";
import { TierBadge } from "@/components/layout/tier-badge";

export function Topbar() {
  const router = useRouter();
  const { data: session } = useSession();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const userInitials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 px-6 backdrop-blur-xl transition-all">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden -ml-2 text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
        onClick={toggleSidebar}
      >
        <Menu className="size-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      <div className="flex-1" />

      {/* Search shortcut */}
      <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full" asChild>
        <Link href="/dashboard/search">
          <Search className="size-5" />
          <span className="sr-only">Search</span>
        </Link>
      </Button>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full ring-2 ring-transparent transition-all hover:ring-primary/20 focus-visible:ring-primary/50">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-xl p-2 shadow-xl border-zinc-200/50 dark:border-zinc-800/50">
          <div className="px-2 py-3 mb-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold tracking-tight truncate">{session?.user?.name}</p>
                <TierBadge />
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>
          <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800" />
          <div className="py-1">
            <DropdownMenuItem asChild className="rounded-lg cursor-pointer px-3 py-2 text-sm focus:bg-zinc-100 dark:focus:bg-zinc-800">
              <Link href="/dashboard/settings">Settings</Link>
            </DropdownMenuItem>
          </div>
          <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800" />
          <div className="py-1">
            <DropdownMenuItem onClick={handleSignOut} className="rounded-lg cursor-pointer px-3 py-2 text-sm text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/50 focus:text-rose-600 dark:text-rose-400 dark:focus:text-rose-400">
              Sign out
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

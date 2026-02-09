"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    CreditCard,
    Wallet,
    Activity,
    Users,
    Settings,
    LogOut,
    ShieldCheck,
    Landmark,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

const navItems = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/orders", label: "Orders", icon: CreditCard },
    { href: "/admin/wallets", label: "Wallets", icon: Wallet },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/gateways", label: "Payment Gateways", icon: Landmark },
    { href: "/admin/logs", label: "System Logs", icon: Activity },
    { href: "/admin/settings", label: "Settings", icon: Settings },
];

interface MobileAdminSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function MobileAdminSidebar({ isOpen, onClose }: MobileAdminSidebarProps) {
    const pathname = usePathname();

    // Fetch current user to get role badge
    const { data: userData } = useQuery<{ success: boolean; data: { name: string; role: string } }>({
        queryKey: ["current-user"],
        queryFn: async () => {
            const res = await fetch("/api/v1/me");
            if (!res.ok) return null;
            return res.json();
        },
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 z-50 bg-black/50 md:hidden"
                onClick={onClose}
            />

            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-100 border-r md:hidden">
                {/* Header */}
                <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
                    <div className="flex items-center gap-2 font-bold text-lg">
                        <div className="p-1 bg-indigo-500 rounded-md">
                            <ShieldCheck className="w-5 h-5 text-white" />
                        </div>
                        <span>Admin Portal</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* User Info */}
                {userData?.data && (
                    <div className="px-4 py-4 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                {userData.data.role === "super_admin" ? "SA" : "A"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{userData.data.name}</p>
                                <p className="text-xs text-slate-400">
                                    {userData.data.role === "super_admin" ? "Super Admin" : "Admin"}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <ScrollArea className="flex-1 px-3 py-4">
                    <nav className="space-y-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={onClose}
                                    className={cn(
                                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
                                            : "text-slate-400 hover:bg-slate-800 hover:text-white",
                                    )}
                                >
                                    <item.icon className="h-4 w-4 flex-shrink-0" />
                                    <span className="truncate">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </ScrollArea>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
                        asChild
                    >
                        <Link href="/dashboard" onClick={onClose}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Exit to Dashboard
                        </Link>
                    </Button>
                </div>
            </aside>
        </>
    );
}

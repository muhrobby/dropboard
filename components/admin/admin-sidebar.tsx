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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

const navItems = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/orders", label: "Orders", icon: CreditCard },
    { href: "/admin/wallets", label: "Wallets", icon: Wallet },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/gateways", label: "Payment Gateways", icon: Landmark },
    { href: "/admin/logs", label: "System Logs", icon: Activity },
    { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden md:flex md:w-64 md:flex-col md:border-r bg-slate-900 text-slate-100">
            <div className="flex h-16 items-center border-b border-slate-800 px-6">
                <div className="flex items-center gap-2 font-bold text-lg">
                    <div className="p-1 bg-indigo-500 rounded-md">
                        <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <span>Admin Portal</span>
                </div>
            </div>

            <ScrollArea className="flex-1 px-3 py-4">
                <nav className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </ScrollArea>

            <div className="p-4 border-t border-slate-800">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
                    asChild
                >
                    <Link href="/dashboard">
                        <LogOut className="mr-2 h-4 w-4" />
                        Exit to Dashboard
                    </Link>
                </Button>
            </div>
        </aside>
    );
}

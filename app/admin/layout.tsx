"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { MobileAdminSidebar } from "@/components/admin/admin-mobile-sidebar";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    // Check if user is admin
    const { data: user, isLoading, error } = useQuery({
        queryKey: ["current-user"],
        queryFn: async () => {
            const res = await fetch("/api/v1/me");
            if (!res.ok) {
                if (res.status === 401) {
                    throw new Error("Not authenticated");
                }
                throw new Error("Failed to fetch user");
            }
            const json = await res.json();
            return json.data;
        },
        retry: false,
    });

    // Redirect if not admin
    useEffect(() => {
        if (!isLoading && (!user || !["admin", "super_admin"].includes(user.role))) {
            router.push("/dashboard");
        }
    }, [isLoading, user, router]);

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="text-center space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
                    <p className="text-sm text-muted-foreground">Verifying admin access...</p>
                </div>
            </div>
        );
    }

    if (error || !user || !["admin", "super_admin"].includes(user.role)) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="text-center space-y-4 max-w-md px-4">
                    <ShieldAlert className="w-16 h-16 mx-auto text-red-500" />
                    <h2 className="text-2xl font-bold">Access Denied</h2>
                    <p className="text-muted-foreground">
                        You don&apos;t have permission to access the admin portal.
                    </p>
                    {user && user.role === "user" && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg text-left">
                            <p className="text-sm text-amber-900 dark:text-amber-200 font-medium mb-2">
                                Role Not Updated
                            </p>
                            <p className="text-sm text-amber-800 dark:text-amber-300">
                                If you were recently granted admin access, please logout and login again to refresh your session.
                            </p>
                        </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                        >
                            Return to Dashboard
                        </button>
                        <button
                            onClick={() => router.push("/login")}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                        >
                            Login Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-dvh overflow-hidden bg-slate-50 dark:bg-slate-950">
            {/* Desktop sidebar */}
            <AdminSidebar />

            {/* Mobile sidebar */}
            <MobileAdminSidebar
                isOpen={isMobileSidebarOpen}
                onClose={() => setIsMobileSidebarOpen(false)}
            />

            {/* Main content area */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Topbar */}
                <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                        {/* Mobile menu button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden"
                            onClick={() => setIsMobileSidebarOpen(true)}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                        <h2 className="font-semibold text-lg">Dropboard Admin</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs text-muted-foreground">
                                {user.role === "super_admin" ? "Super Admin" : "Admin"}
                            </p>
                            <p className="text-sm font-medium">{user.name}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold">
                            {user.role === "super_admin" ? "SA" : "A"}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
